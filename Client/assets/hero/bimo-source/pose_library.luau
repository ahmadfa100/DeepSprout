-- V2 full-body poses authored from the two reference sheets in Client/references/rive-v2.
-- Angles are radians. Left is the near side when facing > 0; negative facing
-- mirrors staging and the gesture chains, independently of lookX/lookY.
local poses: {{[string]:number}} = {
    -- INTRO FOCUS: relaxed tapered arms and partially curled robot hands.
    { yaw=0.18, headPoseTilt=0, torsoX=0, torsoY=0, torsoRotation=0,
      rootX=0, rootY=0, pelvisX=0, pelvisRotation=0, leftThigh=0.025, rightThigh=-0.025,
      leftShoulderY=-69, rightShoulderY=-69,
      leftShoulder=0.25, rightShoulder=-0.25, leftElbow=0.08, rightElbow=-0.08,
      leftWrist=0.05, rightWrist=-0.05, gazeX=0, gazeY=0, breathRate=1.20, breathAmplitude=0.65 },
    -- DEEP FOCUS: centered, open balanced arms, palms up, slower respiration.
    { yaw=0, headPoseTilt=0, torsoX=0, torsoY=0, torsoRotation=0,
      rootX=0, rootY=0, pelvisX=0, pelvisRotation=0, leftThigh=0.025, rightThigh=-0.025,
      leftShoulderY=-68, rightShoulderY=-68,
      leftShoulder=0.56, rightShoulder=-0.56, leftElbow=0.48, rightElbow=-0.48,
      leftWrist=0.53, rightWrist=-0.53, gazeX=0, gazeY=0, breathRate=0.95, breathAmplitude=0.50 },
    -- NOTICE: one folded forearm catches attention; the opposite arm stays relaxed.
    { yaw=0.90, headPoseTilt=-0.035, torsoX=5, torsoY=-1, torsoRotation=-0.025,
      rootX=2, rootY=1, pelvisX=-1, pelvisRotation=0.015, leftThigh=0.06, rightThigh=-0.04,
      leftShoulderY=-72, rightShoulderY=-78,
      leftShoulder=0.30, rightShoulder=-0.38, leftElbow=0.12, rightElbow=-2.25,
      leftWrist=0.02, rightWrist=0.30, gazeX=0.55, gazeY=-0.22, breathRate=1.25, breathAmplitude=0.65 },
    -- CONCERNED: near hand guards the chest, opposite palm opens to stabilize.
    { yaw=0.82, headPoseTilt=0.055, torsoX=-7, torsoY=0, torsoRotation=-0.075,
      rootX=5, rootY=3, pelvisX=3, pelvisRotation=0.012, leftThigh=0.12, rightThigh=-0.08,
      leftShoulderY=-80, rightShoulderY=-65,
      leftShoulder=0.58, rightShoulder=-0.24, leftElbow=-2.65, rightElbow=-1.02,
      leftWrist=-0.40, rightWrist=-1.10, gazeX=0.20, gazeY=-0.10, breathRate=1.40, breathAmplitude=0.58 },
    -- OVERWHELMED: both guarded open hands, torso recoils, shoulders tense.
    { yaw=0.90, headPoseTilt=-0.065, torsoX=8, torsoY=1, torsoRotation=0.045,
      rootX=-7, rootY=5, pelvisX=5, pelvisRotation=-0.018, leftThigh=0.15, rightThigh=-0.13,
      leftShoulderY=-84, rightShoulderY=-83,
      leftShoulder=0.65, rightShoulder=-0.59, leftElbow=-3.03, rightElbow=-2.98,
      leftWrist=-0.74, rightWrist=0.75, gazeX=0.30, gazeY=-0.25, breathRate=1.95, breathAmplitude=0.35 },
}
return { poses=poses, names={'INTRO FOCUS','DEEP FOCUS','NOTICE','CONCERNED','OVERWHELMED'} }
