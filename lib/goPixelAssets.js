/** Required distinct artwork for each dog. Never substitute a different pose. */
export const GO_PIXEL_IMAGE_FIELDS=Object.freeze({thumbnail:'thumbnail_path',front:'front_path',side:'side_path',feed:'feed_path',praise:'praise_path',play:'play_path'});
export const GO_PIXEL_POSES=Object.freeze(['front','side','feed','praise','play']);
export const GO_PIXEL_REQUIRED_KINDS=Object.freeze(['thumbnail',...GO_PIXEL_POSES]);
export function missingGoPixelImages(row){return GO_PIXEL_REQUIRED_KINDS.filter(k=>typeof row?.[GO_PIXEL_IMAGE_FIELDS[k]]!=='string'||!row[GO_PIXEL_IMAGE_FIELDS[k]].trim());}
export function hasAllGoPixelImages(row){return missingGoPixelImages(row).length===0;}
