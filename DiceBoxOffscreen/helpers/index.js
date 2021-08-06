export function lerp(a, b, alpha) {
  return a * (1 - alpha) + b * alpha;
}

/**
 * Create UUIDs 
 * @return {string} Unique UUID
 */
export const createUUID = () => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => {
    const crypto = window.crypto || window.msCrypto
    //eslint-disable-next-line
    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  })
}

export const recursiveSearch = (obj, searchKey, results = []) => {
	const r = results;
	Object.keys(obj).forEach(key => {
		const value = obj[key];
		// if(key === searchKey && typeof value !== 'object'){
		if(key === searchKey){
			r.push(value);
		} else if(value && typeof value === 'object'){
			recursiveSearch(value, searchKey, r);
		}
	});
	return r;
};