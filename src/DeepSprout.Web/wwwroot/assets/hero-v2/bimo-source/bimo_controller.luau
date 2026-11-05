-- Bimo V2: view-model controls -> coordinated full-body pose -> editable RML.
-- Public emotionStage: 0 INTRO, 1 DEEP FOCUS, 2 NOTICE, 3 CONCERNED, 4 OVERWHELMED.
local library = require('pose_library')
type Rig = {
    size: Vector,
    numbers: { [string]: Property<number> },
    pointerEnabled: Property<boolean>?, external: Property<boolean>?,
    debugState: Property<string>?, debugInput: Property<string>?,
    currentStage: number, elapsed: number, duration: number,
    weights: { [string]: {number} }, starts: { [string]: {number} },
    angles: { [string]: number }, velocities: { [string]: number },
    turnX: number, turnY: number, velocityX: number, velocityY: number,
    eyeX: number, eyeY: number, yaw: number, yawVelocity: number,
    facingSide: number, facingVelocity: number,
    sprout: number, sproutVelocity: number,
    time: number, breathPhase: number, nextBlink: number, blinkCount: number,
    moves: number, clicks: number, keys: number,
}
local numericNames = {
    'lookX','lookY','emotionStage','overload','eyeX',
    'eyeY','blinkScale','openEyeOpacity','closedEyeOpacity','headTilt',
    'sproutTilt','faceX','faceY','faceScaleX','faceCounterTilt',
    'headY','headScaleX','headScaleY','leftPodX','leftPodScale',
    'rightPodX','rightPodScale','torsoX','torsoY','torsoRotation',
    'torsoScaleX','torsoScaleY','neckTilt','leftShoulderRotation','leftElbowRotation',
    'leftHandRotation','rightShoulderRotation','rightElbowRotation','rightHandRotation','bodyRootX',
    'bodyRootY','pelvisX','pelvisY','pelvisRotation','headPoseTilt',
    'leftShoulderX','leftShoulderY','rightShoulderX','rightShoulderY','leftThighRotation',
    'leftKneeRotation','leftAnkleX','leftAnkleY','leftFootRotation','rightThighRotation',
    'rightKneeRotation','rightAnkleX','rightAnkleY','rightFootRotation','headSideOpacity',
    'sideMirror','leftPodScaleY','rightPodScaleY','leftArmScaleX','leftArmScaleY',
    'rightArmScaleX','rightArmScaleY','torsoProjection','badgeX','badgeScaleX',
    'bodySideOpacity','facing','leftHipX','leftHipY','rightHipX',
    'rightHipY','leftHandRelaxed','leftHandPalmUp','leftHandOpen','leftHandGuarded',
    'leftHandTense','rightHandRelaxed','rightHandPalmUp','rightHandOpen','rightHandGuarded',
    'rightHandTense','leftPalmScaleX','rightPalmScaleX','palmScaleY',
}
local groups: {[string]:number} = {head=0, body=0.035, hips=0.070, shoulders=0.100, arms=0.130, hands=0.160}
local durations = {0.50,0.65,0.42,0.55,0.60}
local function clamp(x:number,a:number,b:number):number return math.max(a,math.min(b,x)) end
local function spring(x:number,v:number,t:number,k:number,d:number,dt:number):(number,number)
    v += (k*(t-x)-d*v)*dt
    return x+v*dt,v
end
local function get(self:Rig,name:string,fallback:number):number
    local p=self.numbers[name]
    return if p ~= nil then p.value else fallback
end
local function put(self:Rig,name:string,value:number)
    local p=self.numbers[name]
    if p ~= nil then p.value=value end
end
local function pose(self:Rig,name:string,group:string):number
    local sum=0
    for i,w in ipairs(self.weights[group]) do
        local value=library.poses[i][name]
        if value ~= nil then sum+=w*value end
    end
    return sum
end
local function armSpring(self:Rig,name:string,target:number,k:number,d:number,dt:number)
    local angle,velocity=spring(self.angles[name] or 0,self.velocities[name] or 0,target,k,d,dt)
    self.angles[name],self.velocities[name]=angle,velocity
    put(self,name,angle)
end
local function locked(self:Rig):boolean
    return self.pointerEnabled == nil or not self.pointerEnabled.value or get(self,'emotionStage',0)>0
end
local function external(self:Rig):boolean return self.external ~= nil and self.external.value end
local function lockPointer(self:Rig)
    if self.pointerEnabled ~= nil and self.pointerEnabled.value then
        self.pointerEnabled.value=false
        if not external(self) then put(self,'lookX',0);put(self,'lookY',0) end
    end
end
local function debug(self:Rig)
    local stage=math.floor(clamp(get(self,'emotionStage',0),0,4))
    if self.debugState ~= nil then self.debugState.value=library.names[stage+1] end
    if self.debugInput ~= nil then
        self.debugInput.value='MOVE '..tostring(self.moves)..'  KEY '..tostring(self.keys)..'  LOCK '..(if locked(self) then 'ON' else 'OFF')
    end
end
local function selectStage(self:Rig,stage:number)
    put(self,'emotionStage',stage)
    if stage>0 then lockPointer(self) end
    debug(self)
end
function init(self:Rig,context:Context):boolean
    local vm=context:viewModel()
    if vm == nil then return true end
    for _,name in ipairs(numericNames) do
        local p=vm:getNumber(name)
        if p ~= nil then self.numbers[name]=p end
    end
    self.pointerEnabled=vm:getBoolean('pointerLookEnabled')
    self.external=vm:getBoolean('useExternalLook')
    self.debugState=vm:getString('debugStateText');self.debugInput=vm:getString('debugInputText')
    debug(self)
    return true
end
function resize(self:Rig,size:Vector) self.size=size end
function pointerMove(self:Rig,event:PointerEvent)
    self.moves+=1
    if locked(self) or external(self) then debug(self);return end
    local w=if self.size.x>0 then self.size.x else 700
    local h=if self.size.y>0 then self.size.y else 860
    put(self,'lookX',clamp(event.position.x/w*2-1,-1,1))
    put(self,'lookY',clamp((event.position.y-h*238/860)/(h*.31),-1,1))
    debug(self)
end
function pointerExit(self:Rig,_event:PointerEvent)
    if locked(self) or external(self) then return end
    put(self,'lookX',0);put(self,'lookY',0)
end
function pointerDown(self:Rig,event:PointerEvent)
    self.clicks+=1
    -- Local preview only; a host retains ownership of its narrative state.
    if external(self) then return end
    selectStage(self,(math.floor(get(self,'emotionStage',0))+1)%5)
    event:hit()
end
function keyboardEvent(self:Rig,event:KeyboardEvent):boolean
    if event.phase ~= 'down' then return false end
    self.keys+=1
    local key=event.key
    if (key>=1 and key<=5) or (key>=49 and key<=53) then
        selectStage(self,if key<=5 then key-1 else key-49);return true
    elseif key==68 then selectStage(self,if get(self,'emotionStage',0)==1 then 0 else 1);return true
    elseif key==78 then selectStage(self,2);return true
    elseif key==77 then put(self,'facing',-get(self,'facing',.85));return true
    elseif key==82 then
        -- Explicit preview reset is the sole local way to re-enable the pointer.
        selectStage(self,0);put(self,'lookX',0);put(self,'lookY',0)
        if self.external ~= nil then self.external.value=false end
        if self.pointerEnabled ~= nil then self.pointerEnabled.value=true end
        debug(self);return true
    end
    -- Test scripted targets through the same inputs the host will write.
    if key==72 or key==76 or key==75 or key==74 or key==67 then
        if self.external ~= nil then self.external.value=true end
        put(self,'lookX',if key==72 then -1 else if key==76 then 1 else 0)
        put(self,'lookY',if key==75 then -1 else if key==74 then 1 else 0)
        return true
    end
    return false
end
local function plantedLeg(self:Rig,side:number,prefix:string,rootX:number,rootY:number,
                          pelvisX:number,pelvisY:number,pelvisAngle:number,thigh:number)
    local hx=get(self,prefix..'HipX',side*56);local hy=get(self,prefix..'HipY',-4)
    local c,s=math.cos(pelvisAngle),math.sin(pelvisAngle)
    local hipX=rootX+pelvisX+c*hx-s*hy
    local hipY=rootY+pelvisY+s*hx+c*hy
    local angle=pelvisAngle+thigh
    local kneeX=hipX-math.sin(angle)*127;local kneeY=hipY+math.cos(angle)*127
    local dx,dy=350+side*63-kneeX,798-kneeY
    local shin=math.atan2(dy,dx)-math.atan2(85,side*7)
    local travel=math.sqrt(dx*dx+dy*dy)/math.sqrt(85*85+49)
    put(self,prefix..'ThighRotation',thigh);put(self,prefix..'KneeRotation',shin-angle)
    put(self,prefix..'AnkleX',side*7*travel);put(self,prefix..'AnkleY',85*travel)
    put(self,prefix..'FootRotation',-shin)
end
function advance(self:Rig,seconds:number):boolean
    self.time+=seconds
    local dt=math.min(seconds,1/30)
    local stage=math.floor(clamp(get(self,'emotionStage',0),0,4))
    if stage>0 then lockPointer(self) end
    if stage ~= self.currentStage then
        for group,_ in pairs(groups) do
            self.starts[group]={table.unpack(self.weights[group])}
        end
        self.currentStage=stage;self.elapsed=0;self.duration=durations[stage+1]
    end
    self.elapsed+=seconds
    -- Snapshot each layer on a reversal: no pose reset and no transition queue.
    for group,delay in pairs(groups) do
        local t=clamp((self.elapsed-delay)/(self.duration-delay),0,1)
        t=t*t*(3-2*t)
        for i=1,5 do self.weights[group][i]=self.starts[group][i]*(1-t)+(if i==stage+1 then t else 0) end
    end
    local deep=self.weights.head[2];local notice=self.weights.head[3]
    local concern=self.weights.head[4];local over=self.weights.head[5]
    local facing=clamp(get(self,'facing',.85),-1,1)
    self.facingSide,self.facingVelocity=spring(self.facingSide,self.facingVelocity,if facing<0 then -1 else 1,100,20,dt)
    local orientation=clamp(self.facingSide,-1,1)
    local mirror=(1+orientation)*.5
    local x,y=0,0
    if external(self) or (stage==0 and not locked(self)) then
        x=clamp(get(self,'lookX',0),-1,1);y=clamp(get(self,'lookY',0),-1,1)
    elseif stage>=2 then x=pose(self,'gazeX','head')*orientation;y=pose(self,'gazeY','head') end
    x*=1-deep;y*=1-deep
    local overload=clamp(get(self,'overload',.65),0,1)*over
    self.turnX,self.velocityX=spring(self.turnX,self.velocityX,x,64+concern*16+over*36,13+over*4-overload*8,dt)
    self.turnY,self.velocityY=spring(self.turnY,self.velocityY,y,58+concern*15+over*32,12.5+over*4-overload*7,dt)
    self.turnX=clamp(self.turnX,-1.04,1.04);self.turnY=clamp(self.turnY,-1.04,1.04)
    local eyeRate=1-math.exp(-(17+concern*5+over*10)*seconds)
    self.eyeX+=(x-self.eyeX)*eyeRate;self.eyeY+=(y-self.eyeY)*eyeRate
    local yawTarget=clamp(pose(self,'yaw','head')*facing+self.turnX*.20*(1-deep),-.98,.98)
    self.yaw,self.yawVelocity=spring(self.yaw,self.yawVelocity,yawTarget,82,18,dt)
    local yaw=clamp(self.yaw,-.98,.98);local depth=math.abs(yaw)
    put(self,'faceX',yaw*38+self.turnX*2);put(self,'faceY',self.turnY*4)
    put(self,'faceScaleX',1-depth*.24);put(self,'faceCounterTilt',-yaw*.08-self.turnX*.01)
    put(self,'eyeX',self.eyeX*11);put(self,'eyeY',25+self.eyeY*8)
    put(self,'headTilt',self.turnX*.035+self.turnY*.012)
    put(self,'headPoseTilt',pose(self,'headPoseTilt','head')*orientation-self.turnY*.015)
    put(self,'headY',-124+self.turnY*3-over*2)
    put(self,'headScaleX',1-depth*.025);put(self,'headScaleY',1-self.turnY*.012)
    put(self,'headSideOpacity',depth*.72);put(self,'sideMirror',if yaw<0 then -1 else 1)
    put(self,'leftPodX',-143+yaw*13);put(self,'rightPodX',143+yaw*13)
    put(self,'leftPodScale',1+yaw*.62);put(self,'rightPodScale',1-yaw*.62)
    put(self,'leftPodScaleY',1+yaw*.075);put(self,'rightPodScaleY',1-yaw*.075)
    put(self,'torsoProjection',1-depth*.19);put(self,'badgeX',yaw*22)
    put(self,'badgeScaleX',1-depth*.18);put(self,'bodySideOpacity',depth*.65)
    self.breathPhase+=seconds*pose(self,'breathRate','body')
    local breath=math.sin(self.breathPhase)*pose(self,'breathAmplitude','body')
    local micro=math.sin(self.time*.70)*(1-deep)*.65
    put(self,'torsoX',pose(self,'torsoX','body')*orientation+micro+self.turnX*(1-deep)*1.5)
    put(self,'torsoY',-110+pose(self,'torsoY','body')-breath)
    put(self,'torsoRotation',pose(self,'torsoRotation','body')*orientation+self.turnX*.008+micro*.003)
    put(self,'torsoScaleX',1+breath*.001);put(self,'torsoScaleY',1+breath*.0025)
    put(self,'neckTilt',self.turnX*.01+self.turnY*.004)
    local rootX=350+pose(self,'rootX','hips')*orientation
    local rootY=590+pose(self,'rootY','hips')
    local pelvisX=pose(self,'pelvisX','hips')*orientation
    local pelvisAngle=pose(self,'pelvisRotation','hips')*orientation
    put(self,'bodyRootX',rootX);put(self,'bodyRootY',rootY)
    put(self,'pelvisX',pelvisX);put(self,'pelvisY',0);put(self,'pelvisRotation',pelvisAngle)
    put(self,'leftHipX',-56+yaw*7);put(self,'rightHipX',56+yaw*7)
    put(self,'leftHipY',-4-yaw*3);put(self,'rightHipY',-4+yaw*3)
    local thighL=pose(self,'leftThigh','hips')*mirror-pose(self,'rightThigh','hips')*(1-mirror)
    local thighR=pose(self,'rightThigh','hips')*mirror-pose(self,'leftThigh','hips')*(1-mirror)
    plantedLeg(self,-1,'left',rootX,rootY,pelvisX,0,pelvisAngle,thighL)
    plantedLeg(self,1,'right',rootX,rootY,pelvisX,0,pelvisAngle,thighR)
    put(self,'leftShoulderX',-77+math.max(yaw,0)*4+math.max(-yaw,0)*20);put(self,'rightShoulderX',77-math.max(yaw,0)*20-math.max(-yaw,0)*4)
    put(self,'leftShoulderY',pose(self,'leftShoulderY','shoulders')*mirror+pose(self,'rightShoulderY','shoulders')*(1-mirror)-breath*.2)
    put(self,'rightShoulderY',pose(self,'rightShoulderY','shoulders')*mirror+pose(self,'leftShoulderY','shoulders')*(1-mirror)-breath*.2)
    put(self,'leftArmScaleX',1+math.max(yaw,0)*.03-math.max(-yaw,0)*.14);put(self,'leftArmScaleY',1+math.max(yaw,0)*.02-math.max(-yaw,0)*.12)
    put(self,'rightArmScaleX',1+math.max(-yaw,0)*.03-math.max(yaw,0)*.14);put(self,'rightArmScaleY',1+math.max(-yaw,0)*.02-math.max(yaw,0)*.12)
    local follow=math.sin(self.breathPhase-.4)*.003*(1-deep*.4)
    for _,joint in ipairs({'Shoulder','Elbow','Wrist'}) do
        local group=if joint=='Shoulder' then 'shoulders' else if joint=='Elbow' then 'arms' else 'hands'
        local l=pose(self,'left'..joint,group);local r=pose(self,'right'..joint,group)
        local channel=if joint=='Wrist' then 'HandRotation' else joint..'Rotation'
        armSpring(self,'left'..channel,l*mirror-r*(1-mirror)+follow,240,30,dt)
        armSpring(self,'right'..channel,r*mirror-l*(1-mirror)-follow,240,30,dt)
    end
    -- The palm and bearing stay opaque while only the digit contours blend.
    local palmDeep=self.weights.hands[2]
    put(self,'leftPalmScaleX',.85-palmDeep*.23)
    put(self,'rightPalmScaleX',-.85+palmDeep*.23)
    put(self,'palmScaleY',.85+palmDeep*.10)
    -- Hand silhouettes from the V2 hand sheet; fades share wrist attachment.
    local variants={'Relaxed','PalmUp','Open','Guarded','Tense'}
    local leftMap={1,2,1,4,5};local rightMap={1,2,3,3,5}
    for variant,name in ipairs(variants) do
        local l,r=0,0
        for i,w in ipairs(self.weights.hands) do
            if leftMap[i]==variant then l+=w end
            if rightMap[i]==variant then r+=w end
        end
        put(self,'leftHand'..name,l*mirror+r*(1-mirror))
        put(self,'rightHand'..name,r*mirror+l*(1-mirror))
    end
    local headAttitude=pose(self,'headPoseTilt','head')*orientation
    local sproutTarget=clamp(-yaw*.025-headAttitude*.25-self.velocityX*(.003+over*.004)
        -self.yawVelocity*.008+math.sin(self.time*1.6)*.008*(1-deep*.65),-.09,.09)
    self.sprout,self.sproutVelocity=spring(self.sprout,self.sproutVelocity,sproutTarget,24-over*4,7.6-over*1.2,dt)
    put(self,'sproutTilt',self.sprout)
    while self.time>self.nextBlink+.28 do
        self.blinkCount+=1;self.nextBlink+=if self.blinkCount%2==0 then 4.7 else 3.6
    end
    local bt=self.time-self.nextBlink;local blink=1
    if bt>=0 and bt<.10 then blink=1-.92*bt/.10
    elseif bt>=.10 and bt<.28 then local t=(bt-.10)/.18;blink=.08+.92*t*t*(3-2*t) end
    put(self,'blinkScale',(blink+(1-blink)*(notice+concern+over))*(1-over*.10))
    put(self,'openEyeOpacity',1-deep);put(self,'closedEyeOpacity',deep)
    debug(self)
    return true
end
return function(_context:Context):Layout<Rig>
    local weights,starts={},{}
    for group,_ in pairs(groups) do weights[group]={1,0,0,0,0};starts[group]={1,0,0,0,0} end
    return {
        size=Vector.xy(0,0),numbers={},pointerEnabled=nil,external=nil,debugState=nil,debugInput=nil,
        currentStage=-1,elapsed=0,duration=.5,weights=weights,starts=starts,
        angles={leftShoulderRotation=.25,rightShoulderRotation=-.25,leftElbowRotation=.08,rightElbowRotation=-.08,leftHandRotation=.05,rightHandRotation=-.05},velocities={},
        turnX=0,turnY=0,velocityX=0,velocityY=0,eyeX=0,eyeY=0,yaw=0,yawVelocity=0,
        facingSide=1,facingVelocity=0,sprout=0,sproutVelocity=0,time=0,breathPhase=0,nextBlink=2.7,blinkCount=0,
        moves=0,clicks=0,keys=0,init=init,resize=resize,pointerMove=pointerMove,pointerDown=pointerDown,
        pointerExit=pointerExit,keyboardEvent=keyboardEvent,advance=advance,
    }
end
