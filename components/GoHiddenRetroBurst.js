'use client';
// Pixel-art Classic A from the approved offline HIDDEN HTML (17×17 grid).
// Original 28 flight paths and timing remain unchanged.
const COLOR=['#ffffff','#ffffff','#fff5d8','#ffffff'];
function Shape({kind,index,color}){
 const center='#fffef9';
 return <svg viewBox="0 0 17 17" shapeRendering="crispEdges" focusable="false" aria-hidden="true">
  {kind==='big'?<>
   <rect x="7" y="1" width="3" height="15" fill={color}/>
   <rect x="1" y="7" width="15" height="3" fill={color}/>
   <rect x="6" y="6" width="5" height="5" fill={center}/>
  </>:kind==='small'?<>
   <rect x="8" y="3" width="1" height="11" fill={color}/>
   <rect x="3" y="8" width="11" height="1" fill={color}/>
   <rect x="7" y="7" width="3" height="3" fill={center}/>
  </>:<>
   <rect x="6" y="6" width="4" height="4" fill={color}/>
   {index%3===0&&<>
    <rect x="12" y="4" width="2" height="2" fill={color}/>
    <rect x="4" y="12" width="2" height="2" fill={color}/>
   </>}
  </>}
 </svg>;
}
export default function GoHiddenRetroBurst(){
 return <div className="go-album-hidden-burst" data-variant="A">
  {Array.from({length:28},(_,i)=>{
   const kind=i%7===0?'bits':i%5===0?'small':'big';
   const angle=i*360/28;
   const color=COLOR[(i*3)%4];
   const size=(kind==='big'?25:kind==='small'?19:10)+(i%3===0?2:0);
   return <i key={i} style={{
    '--ray-angle':angle+'deg',
    '--ray-inverse':(-angle)+'deg',
    '--ray-distance':(118+(i%6)*14)+'px',
    '--ray-size':size+'px',
    '--ray-delay':(640+(i%5)*56)+'ms',
    '--spark-color':color
   }}><Shape kind={kind} index={i} color={color}/></i>;
  })}
 </div>;
}
