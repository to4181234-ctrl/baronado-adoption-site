export const FIGMA_DOGS=['깡지','버디','뽀실','구름','오레오'];
export const ELEMENTS=['햇살','숲','물결','별빛','온기','꿈결'];
export const DOG_ELEMENTS={'깡지':'햇살','버디':'별빛','뽀실':'숲','구름':'물결','오레오':'온기'};
export function figmaSprite(name,pose='front'){
 const key=({깡지:'kangji',버디:'buddy',뽀실:'pposil',구름:'gureum',오레오:'oreo'})[name]||'pposil';
 const folder=pose==='front'?'/figma-preview/':'/figma-v3/';
 const file=pose==='front'?('dog-'+key+'.png'):(key+'-'+pose+'.png');
 return folder+file;
}
export function gameElement(name){return DOG_ELEMENTS[name]||'꿈결';}
