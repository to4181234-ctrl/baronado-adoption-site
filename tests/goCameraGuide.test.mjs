import test from 'node:test';
import assert from 'node:assert/strict';
import {getCameraGuideCrop} from '../lib/goCameraGuide.mjs';

const geometry={videoWidth:1280,videoHeight:720,containerWidth:390,containerHeight:802,guideLeft:16,guideTop:148,guideWidth:350,guideHeight:350};

test('guide maps to a valid square within the real camera frame',()=>{
 const crop=getCameraGuideCrop(geometry);
 assert.ok(crop.side>0);
 assert.ok(crop.x>=0&&crop.x+crop.side<=geometry.videoWidth);
 assert.ok(crop.y>=0&&crop.y+crop.side<=geometry.videoHeight);
 assert.ok(Math.abs(crop.side-350/(802/720))<0.000001);
});
test('moving the guide moves the source crop instead of staying at video center',()=>{
 const original=getCameraGuideCrop(geometry);
 const shifted=getCameraGuideCrop({...geometry,guideTop:240});
 assert.ok(shifted.y>original.y);
 assert.ok(Math.abs(shifted.x-original.x)<0.000001);
});
test('3x digital zoom captures exactly one third the source area per edge',()=>{
 const normal=getCameraGuideCrop(geometry);
 const zoomed=getCameraGuideCrop({...geometry,digitalZoom:3});
 assert.ok(Math.abs(zoomed.side-normal.side/3)<0.000001);
});
test('hardware camera zoom is not applied twice by the crop helper',()=>{
 const frameAlreadyZoomed=getCameraGuideCrop({...geometry,digitalZoom:1});
 assert.ok(frameAlreadyZoomed.side>getCameraGuideCrop({...geometry,digitalZoom:2}).side);
});
test('crop stays inside video bounds for a guide near the edge',()=>{
 const crop=getCameraGuideCrop({...geometry,guideLeft:-80,guideTop:-90,digitalZoom:1.5});
 assert.ok(crop.x>=0&&crop.y>=0);
 assert.ok(crop.x+crop.side<=geometry.videoWidth&&crop.y+crop.side<=geometry.videoHeight);
});
test('invalid sizes and zoom values are rejected',()=>{
 assert.throws(()=>getCameraGuideCrop({...geometry,videoWidth:0}),RangeError);
 assert.throws(()=>getCameraGuideCrop({...geometry,digitalZoom:-1}),RangeError);
 assert.throws(()=>getCameraGuideCrop({...geometry,guideTop:NaN}),RangeError);
});
