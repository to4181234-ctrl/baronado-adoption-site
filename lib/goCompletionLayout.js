export function completionFit(width,height,cardHeight){
 const scale=Math.max(.05,Math.min(.9,(width-96)/320,(height-76)/Math.max(1,cardHeight)));
 return {scale,height:cardHeight,stageWidth:width,stageHeight:height};
}
