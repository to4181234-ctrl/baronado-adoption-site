// Server-side independent per-trait draw, Figma 173:4511: 1–5 with 10/20/40/20/10%.
// randomInt must be a cryptographically secure integer generator; injection keeps tests deterministic.
export const GO_RATING_WEIGHTS=Object.freeze([10,20,40,20,10]);
export function drawGoRating(randomInt){
 const roll=randomInt(100);
 if (!Number.isInteger(roll)||roll<0||roll>=100) throw new RangeError('invalid rating roll');
 let end=0;
 for(let i=0;i<GO_RATING_WEIGHTS.length;i++){end+=GO_RATING_WEIGHTS[i];if(roll<end)return i+1;}
 throw new Error('unreachable');
}
export function drawGoCardRatings(randomInt){
 return {cuteness:drawGoRating(randomInt),charm:drawGoRating(randomInt),affection:drawGoRating(randomInt)};
}
