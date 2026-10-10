export const FRAME={width:1672,height:941};
// All positions use the gold-master coordinate space; the same seven objects persist.
export const STONES=[
 {id:'growth',ground:[711,704,148,-11],lift:[909,158,160,15],align:[1056,95,107,4],balance:[1058,37,103,-4]},
 {id:'heart',ground:[1333,713,159,8],lift:[1160,109,158,-9],align:[1060,43,98,-6],balance:[1058,88,105,5]},
 {id:'lotus',ground:[558,773,180,-8],lift:[824,342,171,-17],align:[1059,155,108,-5],balance:[1058,139,108,-3]},
 {id:'clock',ground:[787,806,184,9],lift:[1282,276,152,8],align:[1055,215,110,6],balance:[1058,191,106,4]},
 {id:'book',ground:[1001,840,194,0],lift:[744,516,147,-12],align:[1051,275,111,0],balance:[1058,243,107,-2]},
 {id:'community',ground:[1280,822,183,7],lift:[1333,554,161,12],align:[1052,333,111,4],balance:[1058,295,107,3]},
 {id:'sprout',ground:[1486,793,181,-7],lift:[1480,423,154,-9],align:[1054,389,112,-3],balance:[1058,347,107,-2]},
];
// One stage for every state, including the initial poster. Pose bounds never
// drive layout; the 700 × 860 artboard and planted feet remain fixed inside it.
export const BIMO={stage:{left:888,top:358,width:340,height:378}};
export const PHASES=[{name:'ARRIVAL',at:0},{name:'LIFT',at:1.2},{name:'VERTICAL_ALIGNMENT',at:3.8},{name:'PERFECT_BALANCE',at:5.4},{name:'GROW',at:6.4},{name:'LIVING_IDLE',at:8.2}];
export const CAPTURES=[['00-arrival',.8],['01-lift',3.72],['02-vertical-alignment',5.35],['03-perfect-balance',6.399],['04-grow',7.7],['05-living-idle',9.5]];
