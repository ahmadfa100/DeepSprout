-- Editable RML shapes are driven through BimoHead view-model properties.
-- The public controls are lookX, lookY, emotionStage, deepFocus,
-- pointerLookEnabled, useExternalLook, and overload.

type Rig = {
    size: Vector,
    poseChannels: { [string]: Property<number> },
    lookX: Property<number>?,
    lookY: Property<number>?,
    emotionStage: Property<number>?,
    overload: Property<number>?,
    deepFocus: Property<boolean>?,
    pointerLookEnabled: Property<boolean>?,
    useExternalLook: Property<boolean>?,
    debugStateText: Property<string>?,
    debugInputText: Property<string>?,
    pointerMoveCount: number,
    pointerDownCount: number,
    keyboardToggleCount: number,
    deepToggleCount: number,
    demoTargetActive: boolean,
    eyeX: Property<number>?,
    eyeY: Property<number>?,
    blinkScale: Property<number>?,
    openEyeOpacity: Property<number>?,
    closedEyeOpacity: Property<number>?,
    palmRoundness: Property<number>?,
    headTilt: Property<number>?,
    sproutTilt: Property<number>?,
    faceX: Property<number>?,
    faceY: Property<number>?,
    faceScaleX: Property<number>?,
    faceCounterTilt: Property<number>?,
    headY: Property<number>?,
    headScaleX: Property<number>?,
    headScaleY: Property<number>?,
    leftPodX: Property<number>?,
    leftPodScale: Property<number>?,
    rightPodX: Property<number>?,
    rightPodScale: Property<number>?,
    torsoX: Property<number>?,
    torsoY: Property<number>?,
    torsoRotation: Property<number>?,
    torsoScaleX: Property<number>?,
    torsoScaleY: Property<number>?,
    neckTilt: Property<number>?,
    leftShoulderRotation: Property<number>?,
    leftElbowRotation: Property<number>?,
    leftHandRotation: Property<number>?,
    rightShoulderRotation: Property<number>?,
    rightElbowRotation: Property<number>?,
    rightHandRotation: Property<number>?,
    eyeFollowX: number,
    eyeFollowY: number,
    turnX: number,
    turnY: number,
    turnVelocityX: number,
    turnVelocityY: number,
    sproutFollow: number,
    sproutVelocity: number,
    leftShoulderAngle: number,
    leftShoulderVelocity: number,
    leftElbowAngle: number,
    leftElbowVelocity: number,
    leftHandAngle: number,
    leftHandVelocity: number,
    rightShoulderAngle: number,
    rightShoulderVelocity: number,
    rightElbowAngle: number,
    rightElbowVelocity: number,
    rightHandAngle: number,
    rightHandVelocity: number,
    noticeBlend: number,
    noticeVelocity: number,
    concernedBlend: number,
    concernedVelocity: number,
    overwhelmedBlend: number,
    overwhelmedVelocity: number,
    deepBlend: number,
    deepVelocity: number,
    breathPhase: number,
    time: number,
    nextBlink: number,
    blinkCount: number,
}

local function clamp(value: number, minimum: number, maximum: number): number
    return math.max(minimum, math.min(maximum, value))
end

local function spring(position: number, velocity: number, target: number,
                      stiffness: number, damping: number, dt: number): (number, number)
    -- A small underdamped spring adds inertia without a rubbery bounce.
    velocity += (stiffness * (target - position) - damping * velocity) * dt
    position += velocity * dt
    return position, velocity
end

local function smoothstep(low: number, high: number, value: number): number
    local t = clamp((value - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)
end

-- All pose offsets share one CONCERNED envelope. These internal channels
-- extend the existing hierarchy without changing story inputs or ownership.
local poseChannelNames = {
    'overFingerOuterY', 'overFingerMiddleY', 'overFingerScale',
    'bodyRootX', 'bodyRootY', 'pelvisX', 'pelvisY', 'pelvisRotation',
    'headPoseTilt', 'leftShoulderX', 'leftShoulderY',
    'rightShoulderX', 'rightShoulderY',
    'leftThighRotation', 'leftKneeRotation', 'leftAnkleX', 'leftAnkleY', 'leftFootRotation',
    'rightThighRotation', 'rightKneeRotation', 'rightAnkleX', 'rightAnkleY', 'rightFootRotation',
}

local function setPose(self: Rig, name: string, value: number)
    local channel = self.poseChannels[name]
    if channel ~= nil then channel.value = value end
end

local function plantedLeg(self: Rig, side: number, prefix: string,
                         rootX: number, rootY: number, pelvisX: number,
                         pelvisY: number, pelvisAngle: number, thighAngle: number)
    -- The thigh keeps its authored length. Aim the shin at the original floor
    -- anchor, then cancel its rotation at the foot. A few pixels of ankle joint
    -- travel stay under the overlapping boot/toe shells; no artwork is scaled.
    local c, sn = math.cos(pelvisAngle), math.sin(pelvisAngle)
    local hipX = rootX + pelvisX + c * side * 56 + sn * 4
    local hipY = rootY + pelvisY + sn * side * 56 - c * 4
    local thighWorldAngle = pelvisAngle + thighAngle
    local kneeX = hipX - math.sin(thighWorldAngle) * 127
    local kneeY = hipY + math.cos(thighWorldAngle) * 127
    local dx, dy = 350 + side * 63 - kneeX, 798 - kneeY
    local shinAngle = math.atan2(dy, dx) - math.atan2(85, side * 7)
    local jointTravel = math.sqrt(dx * dx + dy * dy) / math.sqrt(85 * 85 + 7 * 7)
    setPose(self, prefix .. 'ThighRotation', thighAngle)
    setPose(self, prefix .. 'KneeRotation', shinAngle - thighWorldAngle)
    setPose(self, prefix .. 'AnkleX', side * 7 * jointTravel)
    setPose(self, prefix .. 'AnkleY', 85 * jointTravel)
    setPose(self, prefix .. 'FootRotation', -shinAngle)
end

local function lockPointerLook(self: Rig)
    if self.pointerLookEnabled == nil or not self.pointerLookEnabled.value then return end
    self.pointerLookEnabled.value = false
    -- Retire the last introductory pointer target. An active external target
    -- is owned by the host and must not be overwritten.
    if self.useExternalLook == nil or not self.useExternalLook.value then
        if self.lookX ~= nil then self.lookX.value = 0 end
        if self.lookY ~= nil then self.lookY.value = 0 end
    end
end

local function updateDebug(self: Rig)
    if self.debugStateText ~= nil and self.emotionStage ~= nil then
        local stateText = if self.emotionStage.value >= 3 then 'OVERWHELMED'
            else if self.emotionStage.value >= 2 then 'CONCERNED'
            else if self.emotionStage.value >= 1 then 'NOTICE'
            else if self.deepFocus ~= nil and self.deepFocus.value then 'DEEP FOCUS' else 'FOCUS'
        if self.debugStateText.value ~= stateText then
            self.debugStateText.value = stateText
        end
    end
    if self.debugInputText ~= nil then
        local inputText = 'MOVE ' .. tostring(self.pointerMoveCount)
            .. '  DOWN ' .. tostring(self.pointerDownCount)
            .. '  N ' .. tostring(self.keyboardToggleCount)
            .. '  D ' .. tostring(self.deepToggleCount)
        if self.debugInputText.value ~= inputText then
            self.debugInputText.value = inputText
        end
    end
end

local function setEmotionStage(self: Rig, stage: number)
    if self.emotionStage == nil then return end
    if stage >= 1 and self.deepFocus ~= nil then
        self.deepFocus.value = false
    end
    if stage >= 1 then lockPointerLook(self) end
    self.emotionStage.value = stage
    if stage == 0 and self.demoTargetActive then
        if self.lookX ~= nil then self.lookX.value = 0 end
        if self.lookY ~= nil then self.lookY.value = 0 end
        self.demoTargetActive = false
    end
    -- Neutral preview stages get a small authored target. External host targets
    -- remain untouched, and pointer callbacks cannot reclaim story gaze.
    if stage >= 1 and (self.useExternalLook == nil or not self.useExternalLook.value)
        and self.lookX ~= nil and math.abs(self.lookX.value) < 0.25 then
        self.lookX.value = if stage >= 2 then -0.45 else 0.7
        self.demoTargetActive = true
        if self.lookY ~= nil and math.abs(self.lookY.value) < 0.25 then
            self.lookY.value = if stage >= 2 then -0.25 else -0.15
        end
    end
    updateDebug(self)
end

local function toggleEmotion(self: Rig)
    if self.emotionStage == nil then return end
    setEmotionStage(self, if self.emotionStage.value < 1 then 1 else 0)
end

function init(self: Rig, context: Context): boolean
    -- The bound view model is unavailable during the first init.
    local vm = context:viewModel()
    if vm == nil then return true end
    for _, name in ipairs(poseChannelNames) do
        local property = vm:getNumber(name)
        if property ~= nil then self.poseChannels[name] = property end
    end
    self.lookX = vm:getNumber('lookX')
    self.lookY = vm:getNumber('lookY')
    self.emotionStage = vm:getNumber('emotionStage')
    self.overload = vm:getNumber('overload')
    self.deepFocus = vm:getBoolean('deepFocus')
    self.pointerLookEnabled = vm:getBoolean('pointerLookEnabled')
    self.useExternalLook = vm:getBoolean('useExternalLook')
    self.debugStateText = vm:getString('debugStateText')
    self.debugInputText = vm:getString('debugInputText')
    self.eyeX = vm:getNumber('eyeX')
    self.eyeY = vm:getNumber('eyeY')
    self.blinkScale = vm:getNumber('blinkScale')
    self.openEyeOpacity = vm:getNumber('openEyeOpacity')
    self.closedEyeOpacity = vm:getNumber('closedEyeOpacity')
    self.palmRoundness = vm:getNumber('palmRoundness')
    self.headTilt = vm:getNumber('headTilt')
    self.sproutTilt = vm:getNumber('sproutTilt')
    self.faceX = vm:getNumber('faceX')
    self.faceY = vm:getNumber('faceY')
    self.faceScaleX = vm:getNumber('faceScaleX')
    self.faceCounterTilt = vm:getNumber('faceCounterTilt')
    self.headY = vm:getNumber('headY')
    self.headScaleX = vm:getNumber('headScaleX')
    self.headScaleY = vm:getNumber('headScaleY')
    self.leftPodX = vm:getNumber('leftPodX')
    self.leftPodScale = vm:getNumber('leftPodScale')
    self.rightPodX = vm:getNumber('rightPodX')
    self.rightPodScale = vm:getNumber('rightPodScale')
    self.torsoX = vm:getNumber('torsoX')
    self.torsoY = vm:getNumber('torsoY')
    self.torsoRotation = vm:getNumber('torsoRotation')
    self.torsoScaleX = vm:getNumber('torsoScaleX')
    self.torsoScaleY = vm:getNumber('torsoScaleY')
    self.neckTilt = vm:getNumber('neckTilt')
    self.leftShoulderRotation = vm:getNumber('leftShoulderRotation')
    self.leftElbowRotation = vm:getNumber('leftElbowRotation')
    self.leftHandRotation = vm:getNumber('leftHandRotation')
    self.rightShoulderRotation = vm:getNumber('rightShoulderRotation')
    self.rightElbowRotation = vm:getNumber('rightElbowRotation')
    self.rightHandRotation = vm:getNumber('rightHandRotation')
    updateDebug(self)
    return true
end

function resize(self: Rig, size: Vector)
    self.size = size
end

-- Preview gesture: click to inspect both states without a host application.
-- External hosts own emotionStage while useExternalLook is enabled.
function pointerDown(self: Rig, event: PointerEvent)
    self.pointerDownCount += 1
    print('Bimo pointerDown received: ' .. tostring(self.pointerDownCount))
    if self.useExternalLook ~= nil and self.useExternalLook.value then return end
    if self.emotionStage ~= nil then
        toggleEmotion(self)
        print('Bimo emotionStage = ' .. tostring(self.emotionStage.value))
        event:hit()
    end
end

function pointerMove(self: Rig, event: PointerEvent)
    self.pointerMoveCount += 1
    if self.pointerMoveCount == 1 then print('Bimo pointerMove received') end
    updateDebug(self)
    if self.pointerLookEnabled == nil or not self.pointerLookEnabled.value
        or (self.emotionStage ~= nil and self.emotionStage.value >= 1)
        or (self.deepFocus ~= nil and self.deepFocus.value)
        or (self.useExternalLook ~= nil and self.useExternalLook.value) then return end
    self.demoTargetActive = false
    local width = if self.size.x > 0 then self.size.x else 700
    local height = if self.size.y > 0 then self.size.y else 860
    if self.lookX ~= nil then
        self.lookX.value = clamp((event.position.x / width) * 2 - 1, -1, 1)
    end
    if self.lookY ~= nil then
        -- Neutral is the face center, not the middle of the taller artboard.
        self.lookY.value = clamp((event.position.y - height * (238 / 860))
            / (height * 0.31), -1, 1)
    end
end

function keyboardEvent(self: Rig, event: KeyboardEvent): boolean
    if event.phase ~= 'down' then return false end
    if event.key == 68 then
        if self.emotionStage == nil or self.emotionStage.value >= 1
            or self.deepFocus == nil then return false end
        self.deepToggleCount += 1
        self.deepFocus.value = not self.deepFocus.value
        if self.deepFocus.value then lockPointerLook(self) end
        updateDebug(self)
        print('Bimo deepFocus = ' .. tostring(self.deepFocus.value))
        return true
    end
    -- The CLI 1.5.1 player reports digit keys as 1, 2, 3, 4 rather than
    -- character codes. Accept both forms for other hosts.
    if (event.key >= 1 and event.key <= 4)
        or (event.key >= 49 and event.key <= 52) then
        local stage = if event.key <= 4 then event.key - 1 else event.key - 49
        setEmotionStage(self, stage)
        print('Bimo emotionStage = ' .. tostring(stage))
        return true
    end
    if event.key ~= 78 then return false end
    self.keyboardToggleCount += 1
    print('Bimo keyboard N received: ' .. tostring(self.keyboardToggleCount))
    toggleEmotion(self)
    if self.emotionStage ~= nil then
        print('Bimo emotionStage = ' .. tostring(self.emotionStage.value))
    end
    return true
end

function pointerExit(self: Rig, _event: PointerEvent)
    if self.pointerLookEnabled == nil or not self.pointerLookEnabled.value
        or (self.emotionStage ~= nil and self.emotionStage.value >= 1)
        or (self.deepFocus ~= nil and self.deepFocus.value)
        or (self.useExternalLook ~= nil and self.useExternalLook.value) then return end
    if self.lookX ~= nil then self.lookX.value = 0 end
    if self.lookY ~= nil then self.lookY.value = 0 end
end

function advance(self: Rig, seconds: number): boolean
    self.time += seconds
    if (self.deepFocus ~= nil and self.deepFocus.value)
        or (self.emotionStage ~= nil and self.emotionStage.value >= 1) then
        lockPointerLook(self)
    end
    updateDebug(self)
    local rawX = if self.lookX ~= nil then clamp(self.lookX.value, -1, 1) else 0
    local rawY = if self.lookY ~= nil then clamp(self.lookY.value, -1, 1) else 0
    local dt = math.min(seconds, 1 / 30)
    local noticeTarget = if self.emotionStage ~= nil and self.emotionStage.value >= 1 then 1 else 0
    local deepTarget = if noticeTarget == 0 and self.deepFocus ~= nil
        and self.deepFocus.value then 1 else 0
    -- A nested FOCUS pose, independent of the FOCUS/NOTICE state machine.
    -- Gaze centers first, wrists follow the arms, and lids close last.
    self.deepBlend, self.deepVelocity = spring(
        self.deepBlend, self.deepVelocity, deepTarget, 48, 14, dt)
    self.deepBlend = clamp(self.deepBlend, 0, 1)
    local deep = self.deepBlend
    local concernedTarget = if self.emotionStage ~= nil and self.emotionStage.value >= 2 then 1 else 0
    self.concernedBlend, self.concernedVelocity = spring(
        self.concernedBlend, self.concernedVelocity, concernedTarget, 125, 20, dt)
    self.concernedBlend = clamp(self.concernedBlend, 0, 1)
    local concerned = self.concernedBlend
    -- Gaze leads; torso, weight, shoulders, and arms follow the same pose blend.
    local concernedBody = smoothstep(0.05, 0.75, concerned)
    local concernedHips = smoothstep(0.12, 0.83, concerned)
    local concernedShoulders = smoothstep(0.18, 0.88, concerned)
    -- A separate envelope overlays only the final story pose. Earlier stages
    -- keep their approved channels exactly. Reversals retain spring momentum.
    local overwhelmedTarget = if self.emotionStage ~= nil and self.emotionStage.value >= 3 then 1 else 0
    self.overwhelmedBlend, self.overwhelmedVelocity = spring(
        self.overwhelmedBlend, self.overwhelmedVelocity, overwhelmedTarget,
        if overwhelmedTarget == 1 then 110 else 90,
        if overwhelmedTarget == 1 then 19 else 18, dt)
    self.overwhelmedBlend = clamp(self.overwhelmedBlend, 0, 1)
    local overwhelmed = self.overwhelmedBlend
    local overload = if self.overload ~= nil then clamp(self.overload.value, 0, 1) else 0.65
    local unstable = overwhelmed * overload
    local overwhelmedBody = smoothstep(0.06, 0.78, overwhelmed)
    local overwhelmedHips = smoothstep(0.14, 0.86, overwhelmed)
    local overwhelmedShoulders = smoothstep(0.20, 0.89, overwhelmed)
    local overwhelmedArms = smoothstep(0.25, 0.90, overwhelmed)
    local headPoseAngle = concernedBody * 0.045 + overwhelmedBody * 0.045
    setPose(self, 'headPoseTilt', headPoseAngle)
    local centeredGaze = smoothstep(0, 0.75, deep)
    local deepArms = smoothstep(0.08, 0.88, deep)
    local deepPalms = smoothstep(0.22, 0.96, deep)
    local eyeNarrow = smoothstep(0.28, 0.80, deep)
    local closedEyes = smoothstep(0.50, 0.86, deep)
    -- Pointer and host values remain intact. The active pose selects whether
    -- they are followed; NOTICE continues to use the supplied target.
    local x = rawX * (1 - centeredGaze)
    local y = rawY * (1 - centeredGaze)
    local eyeFollow = 1 - math.exp(-(16 + concerned * 5 + overwhelmed * 10) * seconds)
    self.eyeFollowX += (x - self.eyeFollowX) * eyeFollow
    self.eyeFollowY += (y - self.eyeFollowY) * eyeFollow

    -- Capture attention in roughly a third of a second; release more softly.
    local noticeStiffness = if noticeTarget == 1 then 130 else 82
    local noticeDamping = if noticeTarget == 1 then 20 else 17
    self.noticeBlend, self.noticeVelocity = spring(
        self.noticeBlend, self.noticeVelocity, noticeTarget,
        noticeStiffness, noticeDamping, dt)
    self.noticeBlend = clamp(self.noticeBlend, 0, 1)
    local notice = self.noticeBlend
    self.turnX, self.turnVelocityX = spring(
        self.turnX, self.turnVelocityX, x,
        55 + concerned * 21 + overwhelmed * 38, 11.5 + concerned * 2.2 + overwhelmed * 4 - unstable * 8, dt)
    self.turnY, self.turnVelocityY = spring(
        self.turnY, self.turnVelocityY, y,
        49 + concerned * 19 + overwhelmed * 34, 11 + concerned * 2 + overwhelmed * 4 - unstable * 7, dt)
    -- Target-driven underdamping creates deterministic imperfect settling.
    -- There is no autonomous jitter: a steady target always settles. overload=0
    -- uses the faster, well-damped response; overload=1 retains more inertia.
    -- Limit the small spring overshoot so the panel never approaches the rim.
    self.turnX = clamp(self.turnX, -1.04, 1.04)
    self.turnY = clamp(self.turnY, -1.04, 1.04)

    -- A directly supplied Reel target always wins. For a centered local
    -- NOTICE/CONCERNED test with no external target, apply a small bias only
    -- to the pose. The public look controls remain untouched.
    local centeredPreview = (self.useExternalLook == nil or not self.useExternalLook.value)
        and math.abs(x) < 0.15 and math.abs(y) < 0.15
    local attentionX = self.turnX
    if centeredPreview then
        attentionX += notice * (0.32 - concerned * 0.55 - attentionX)
    end

    -- NOTICE adds a controlled turn to the existing 2.5D face/pod parallax.
    -- The shell itself remains restrained; FOCUS keeps its original values.
    local headAngle = attentionX * (0.14 + notice * 0.05)
        + self.turnY * 0.008
    if self.headTilt ~= nil then self.headTilt.value = headAngle end
    if self.headY ~= nil then
        self.headY.value = -124 + self.turnY * (2 + notice * 1.5) - concerned * 2 - overwhelmedBody * 3
    end
    if self.headScaleX ~= nil then
        self.headScaleX.value = 1 - math.abs(attentionX) * (0.015 + notice * 0.009)
    end
    if self.headScaleY ~= nil then
        self.headScaleY.value = 1 - self.turnY * (0.012 + notice * 0.004)
    end

    -- The recessed face travels only a few pixels; the eyes have extra range.
    if self.faceX ~= nil then self.faceX.value = attentionX * (5 + notice * 2.5) end
    if self.faceY ~= nil then self.faceY.value = self.turnY * (2.5 + notice * 1) end
    if self.faceScaleX ~= nil then
        self.faceScaleX.value = 1 - math.abs(attentionX) * (0.025 + notice * 0.018)
    end
    if self.faceCounterTilt ~= nil then self.faceCounterTilt.value = -headAngle * 0.22 end
    local eyeAttentionX = self.eyeFollowX + notice * (attentionX - self.eyeFollowX)
    eyeAttentionX += overwhelmed * 0.55 * (self.eyeFollowX - eyeAttentionX)
    if self.eyeX ~= nil then self.eyeX.value = eyeAttentionX * (9 + notice * 4) end
    if self.eyeY ~= nil then self.eyeY.value = 25 + self.eyeFollowY * (7 + notice * 2) end

    -- The pod on the look side comes slightly forward while the other recedes.
    if self.leftPodX ~= nil then
        self.leftPodX.value = -151 + attentionX * (3 + notice * 2)
    end
    if self.rightPodX ~= nil then
        self.rightPodX.value = 151 + attentionX * (3 + notice * 2)
    end
    if self.leftPodScale ~= nil then
        self.leftPodScale.value = 1 - attentionX * (0.09 + notice * 0.025)
    end
    if self.rightPodScale ~= nil then
        self.rightPodScale.value = 1 + attentionX * (0.09 + notice * 0.025)
    end

    -- Counter-rotation springs behind the head, then settles into a tiny sway.
    local enterImpulse = -math.max(self.noticeVelocity, 0) * attentionX * 0.005
    local sproutTarget = clamp(-(headAngle + headPoseAngle * 0.5) * 0.35 - self.turnVelocityX * 0.003
        + math.sin(self.time * 1.65) * 0.010 * (1 - deep * 0.7)
        + notice * (attentionX * 0.010 - self.turnY * 0.006)
        + concerned * (-self.turnVelocityX * 0.0035
            + math.sin(self.time * 2.1) * 0.004)
        + enterImpulse - self.concernedVelocity * 0.0015
        - overwhelmed * self.turnVelocityX * 0.004 - self.overwhelmedVelocity * 0.002,
        -0.07 - concerned * 0.012 - overwhelmed * 0.025, 0.07 + concerned * 0.012 + overwhelmed * 0.025)
    self.sproutFollow, self.sproutVelocity = spring(
        self.sproutFollow, self.sproutVelocity, sproutTarget, 23 - overwhelmed * 3, 7.5 - overwhelmed * 1.2, dt)
    if self.sproutTilt ~= nil then self.sproutTilt.value = self.sproutFollow end

    -- The pose transfers upper mass left and hips slightly right. The torso
    -- leans around its existing center; its lower edge still meets the pelvis.
    -- Existing breathing and all non-CONCERNED poses retain their channels.
    self.breathPhase += seconds * (1.25 - deep * 0.28 + concerned * 0.15 + overwhelmed * 0.65)
    local breath = math.sin(self.breathPhase) * (1 - overwhelmed * 0.42)
    local weight = math.sin(self.time * 0.72) * (1 - deep * 0.85)
    if self.torsoX ~= nil then
        self.torsoX.value = weight * 1.1
            + attentionX * (1.2 + notice * 7.0) * (1 - concernedBody * 0.55)
            - concernedBody * 6 + overwhelmedBody * 10
    end
    if self.torsoY ~= nil then self.torsoY.value = -110 - breath * 0.8 - notice * 0.5 + overwhelmedBody * 1.5 end
    if self.torsoRotation ~= nil then
        self.torsoRotation.value = weight * 0.006
            + attentionX * (0.012 + notice * 0.05) * (1 - concernedBody * 0.65)
            + self.turnY * (0.003 + notice * 0.004)
            - concernedBody * 0.070 + overwhelmedBody * 0.040
    end
    if self.torsoScaleX ~= nil then self.torsoScaleX.value = 1 + breath * 0.0015 end
    if self.torsoScaleY ~= nil then self.torsoScaleY.value = 1 + breath * 0.003 end
    if self.neckTilt ~= nil then
        self.neckTilt.value = attentionX * (0.015 + notice * 0.005)
            + self.turnY * 0.006
    end

    local rootX, rootY = 350 + concernedBody * 5 - overwhelmedBody * 10, 590 + concernedHips * 3 + overwhelmedHips * 2
    local pelvisX, pelvisY, pelvisAngle = concernedHips * 2 + overwhelmedHips * 2, 0, concernedHips * 0.012 - overwhelmedHips * 0.022
    setPose(self, 'bodyRootX', rootX)
    setPose(self, 'bodyRootY', rootY)
    setPose(self, 'pelvisX', pelvisX)
    setPose(self, 'pelvisY', pelvisY)
    setPose(self, 'pelvisRotation', pelvisAngle)
    plantedLeg(self, -1, 'left', rootX, rootY, pelvisX, pelvisY, pelvisAngle, concernedHips * 0.11 + overwhelmedHips * 0.035)
    plantedLeg(self, 1, 'right', rootX, rootY, pelvisX, pelvisY, pelvisAngle, -concernedHips * 0.08 - overwhelmedHips * 0.045)
    setPose(self, 'leftShoulderX', -83 + concernedShoulders * 3 + overwhelmedShoulders * 2)
    setPose(self, 'leftShoulderY', -66 - concernedShoulders * 8 - overwhelmedShoulders * 5)
    setPose(self, 'rightShoulderX', 83 + concernedShoulders * 2 - overwhelmedShoulders * 5)
    setPose(self, 'rightShoulderY', -66 + concernedShoulders * 3 - overwhelmedShoulders * 15)

    -- Pivots settle at different rates: shoulder, then elbow, then wrist.
    local armFollow = math.sin(self.breathPhase - 0.48)
    local handFollow = math.sin(self.breathPhase - 0.95)
    -- The arm on the target side responds; the other keeps its FOCUS rest.
    local leftReaction = clamp(-attentionX * 2, 0, 1) * notice
    -- At a centered test target, keep a small right-arm cue so NOTICE is
    -- still visually distinct in the temporary CLI diagnostic preview.
    local centeredCue = clamp(1 - math.abs(attentionX) * 4, 0, 1) * 0.55
    local rightReaction = math.max(clamp(attentionX * 2, 0, 1), centeredCue) * notice
    -- A guarded left forearm comes toward the torso; the right hand stays open.
    -- This arm response follows the faster gaze and facial realization.
    local concernedArms = smoothstep(0.24, 0.88, concerned)
    local leftShoulderTarget = 0.49 + breath * 0.009 + weight * 0.005
        + attentionX * 0.008 + leftReaction * 0.24 + deepArms * 0.07
    leftShoulderTarget += concernedArms * (0.68 + breath * 0.004 - leftShoulderTarget)
    local rightShoulderTarget = -0.49 - breath * 0.009 + weight * 0.005
        + attentionX * 0.008 - rightReaction * 0.24 - deepArms * 0.07
    rightShoulderTarget += concernedArms * (-0.28 - breath * 0.004 - rightShoulderTarget)
    local leftElbowTarget = 0.40 + armFollow * 0.009 + attentionX * 0.006
        - leftReaction * 0.035 + deepArms * 0.04
    leftElbowTarget += concernedArms * (-2.68 + armFollow * 0.004 - leftElbowTarget)
    local rightElbowTarget = -0.40 - armFollow * 0.009 + attentionX * 0.006
        + rightReaction * 0.035 - deepArms * 0.04
    rightElbowTarget += concernedArms * (-0.68 - armFollow * 0.005 - rightElbowTarget)
    local leftHandTarget = 0.08 + handFollow * 0.012 + deepPalms * 0.48
    leftHandTarget += concernedArms * (-0.18 + handFollow * 0.004 - leftHandTarget)
    local rightHandTarget = -0.08 - handFollow * 0.012 - deepPalms * 0.48
    rightHandTarget += concernedArms * (-1.00 - handFollow * 0.004 - rightHandTarget)
    setPose(self, 'overFingerOuterY', 60 - overwhelmedArms * 6)
    setPose(self, 'overFingerMiddleY', 64 - overwhelmedArms * 7)
    setPose(self, 'overFingerScale', 1 - overwhelmedArms * 0.15)
    -- Both connected chains fold upward. Elbows remain outside the torso,
    -- wrists meet their forearms, and the two open hands stay separated.
    leftShoulderTarget += overwhelmedArms * (0.60 + breath * 0.003 - leftShoulderTarget)
    rightShoulderTarget += overwhelmedArms * (-0.55 - breath * 0.003 - rightShoulderTarget)
    leftElbowTarget += overwhelmedArms * (-3.24 + armFollow * 0.003 - leftElbowTarget)
    rightElbowTarget += overwhelmedArms * (-3.1131853 - armFollow * 0.003 - rightElbowTarget)
    leftHandTarget += overwhelmedArms * (-0.85 + handFollow * 0.003 - leftHandTarget)
    rightHandTarget += overwhelmedArms * (0.82 - handFollow * 0.003 - rightHandTarget)
    self.leftShoulderAngle, self.leftShoulderVelocity = spring(
        self.leftShoulderAngle, self.leftShoulderVelocity,
        leftShoulderTarget, 36 + concerned * 64, 9.5 + concerned * 8.5, dt)
    self.rightShoulderAngle, self.rightShoulderVelocity = spring(
        self.rightShoulderAngle, self.rightShoulderVelocity,
        rightShoulderTarget, 36 + concerned * 64, 9.5 + concerned * 8.5, dt)
    self.leftElbowAngle, self.leftElbowVelocity = spring(
        self.leftElbowAngle, self.leftElbowVelocity,
        leftElbowTarget, 27 + concerned * 150, 8.3 + concerned * 15, dt)
    self.rightElbowAngle, self.rightElbowVelocity = spring(
        self.rightElbowAngle, self.rightElbowVelocity,
        rightElbowTarget, 27 + concerned * 130, 8.3 + concerned * 14, dt)
    self.leftHandAngle, self.leftHandVelocity = spring(
        self.leftHandAngle, self.leftHandVelocity,
        leftHandTarget, 20 + concerned * 66, 7.2 + concerned * 8.5, dt)
    self.rightHandAngle, self.rightHandVelocity = spring(
        self.rightHandAngle, self.rightHandVelocity,
        rightHandTarget, 20 + concerned * 66, 7.2 + concerned * 8.5, dt)
    if self.leftShoulderRotation ~= nil then self.leftShoulderRotation.value = self.leftShoulderAngle end
    if self.leftElbowRotation ~= nil then self.leftElbowRotation.value = self.leftElbowAngle end
    if self.leftHandRotation ~= nil then self.leftHandRotation.value = self.leftHandAngle end
    if self.rightShoulderRotation ~= nil then self.rightShoulderRotation.value = self.rightShoulderAngle end
    if self.rightElbowRotation ~= nil then self.rightElbowRotation.value = self.rightElbowAngle end
    if self.rightHandRotation ~= nil then self.rightHandRotation.value = self.rightHandAngle end

    -- Quick close, slower ease-open, with alternating pauses.
    while self.time > self.nextBlink + 0.28 do
        self.blinkCount += 1
        self.nextBlink += if self.blinkCount % 2 == 0 then 4.7 else 3.6
    end
    local blinkTime = self.time - self.nextBlink
    local scale = 1
    if blinkTime >= 0 and blinkTime < 0.10 then
        scale = 1 - 0.92 * (blinkTime / 0.10)
    elseif blinkTime >= 0.10 and blinkTime < 0.28 then
        local opening = (blinkTime - 0.10) / 0.18
        scale = 0.08 + 0.92 * (opening * opening * (3 - 2 * opening))
    end
    -- NOTICE holds the eyes open; FOCUS keeps the natural idle blink.
    if self.blinkScale ~= nil then
        self.blinkScale.value = (scale + (1 - scale) * notice)
            * (1 - eyeNarrow * 0.92) * (1 - overwhelmed * 0.13)
    end
    if self.openEyeOpacity ~= nil then self.openEyeOpacity.value = 1 - closedEyes end
    if self.closedEyeOpacity ~= nil then self.closedEyeOpacity.value = closedEyes end
    if self.palmRoundness ~= nil then self.palmRoundness.value = 19 + deepPalms * 7 end
    return true
end

return function(_context: Context): Layout<Rig>
    return {
        size = Vector.xy(0, 0),
        poseChannels = {},
        lookX = nil,
        lookY = nil,
        emotionStage = nil,
        overload = nil,
        deepFocus = nil,
        pointerLookEnabled = nil,
        useExternalLook = nil,
        debugStateText = nil,
        debugInputText = nil,
        pointerMoveCount = 0,
        pointerDownCount = 0,
        keyboardToggleCount = 0,
        deepToggleCount = 0,
        demoTargetActive = false,
        eyeX = nil,
        eyeY = nil,
        blinkScale = nil,
        openEyeOpacity = nil,
        closedEyeOpacity = nil,
        palmRoundness = nil,
        headTilt = nil,
        sproutTilt = nil,
        faceX = nil,
        faceY = nil,
        faceScaleX = nil,
        faceCounterTilt = nil,
        headY = nil,
        headScaleX = nil,
        headScaleY = nil,
        leftPodX = nil,
        leftPodScale = nil,
        rightPodX = nil,
        rightPodScale = nil,
        torsoX = nil,
        torsoY = nil,
        torsoRotation = nil,
        torsoScaleX = nil,
        torsoScaleY = nil,
        neckTilt = nil,
        leftShoulderRotation = nil,
        leftElbowRotation = nil,
        leftHandRotation = nil,
        rightShoulderRotation = nil,
        rightElbowRotation = nil,
        rightHandRotation = nil,
        eyeFollowX = 0,
        eyeFollowY = 0,
        turnX = 0,
        turnY = 0,
        turnVelocityX = 0,
        turnVelocityY = 0,
        sproutFollow = 0,
        sproutVelocity = 0,
        leftShoulderAngle = 0.49,
        leftShoulderVelocity = 0,
        leftElbowAngle = 0.40,
        leftElbowVelocity = 0,
        leftHandAngle = 0.08,
        leftHandVelocity = 0,
        rightShoulderAngle = -0.49,
        rightShoulderVelocity = 0,
        rightElbowAngle = -0.40,
        rightElbowVelocity = 0,
        rightHandAngle = -0.08,
        rightHandVelocity = 0,
        noticeBlend = 0,
        noticeVelocity = 0,
        concernedBlend = 0,
        concernedVelocity = 0,
        overwhelmedBlend = 0,
        overwhelmedVelocity = 0,
        deepBlend = 0,
        deepVelocity = 0,
        breathPhase = 0,
        time = 0,
        nextBlink = 2.7,
        blinkCount = 0,
        init = init,
        resize = resize,
        pointerDown = pointerDown,
        pointerMove = pointerMove,
        pointerExit = pointerExit,
        keyboardEvent = keyboardEvent,
        advance = advance,
    }
end
