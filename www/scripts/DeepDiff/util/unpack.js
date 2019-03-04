import "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js";

export{
	unZip,
	unPack
};

/*
global File
global JSZip
*/

const mimeTypes = {
	'zip': [
		'application/x-zip-compressed',
		'application/zip'
	]
};

async function unPack(fileList){
	let allFiles = {};
	for(let file of fileList){
		let files = [];
		if(!(file instanceof File)){
			throw new Error("Invalid object. Expecting 'File' received '" + (typeof file) + "'");
		}
		if (mimeTypes.zip.includes(file.type)){
			let zipList = await unZip(file,{recurse:true});
			zipList = Object.values(zipList);
			zipList.forEach((file)=>{
				files.push(file);
			});
		}
		else{
			files.push(file);
		}
		files.forEach((file)=>{
			if(!file.relativePath){
				file.relativePath = file.webkitRelativePath || '/';
				file.fullPath = file.relativePath + '/' + file.name;
			}
			allFiles[file.fullPath] = file;
		});
	}
	return allFiles;
}


function isZip(blob){
	return new Promise(resolve=>{
		let reader = new FileReader();
		reader.onprogress = (e)=>{
			let bytes = new Uint32Array(reader.result,0,1);
			reader.abort();

			// https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html
			// "PK--"
			// \x50\x4b\x03\x04
			// ... or as an integer
			let isPK = bytes[0] === 67324752;
			resolve(isPK);
		};
		reader.readAsArrayBuffer(blob);
	});
}

async function unZip(zip,opts = {}){
	if(zip === null){
		return [];
	}
	opts = Object.assign({recurse:true},opts);
	zip.relativePath = zip.relativePath || zip.webkitRelativePath || ".";
	let loc = new URL('file://'+zip.name+"!/")

	let files = await JSZip.loadAsync(zip);
	files = files.files;
	let names = Object.keys(files);

	let unpacked = {};
	for(let f = 0; f < names.length; f++){
		let name = names[f];
		let file = files[name];
		if(file.dir){
			continue;
		}

		let blob = await file.async('blob');
		loc.pathname = name;
		let path = decodeURIComponent(loc.href.replace(loc.origin,''));
		path = path.split('/');
		name = path.pop();
		path = path.join('/');
		file = new File([blob],name,{
			type: 'application/octet-stream',
			lastModified: file.date,
		});
		file.relativePath = path;

		// this probably seems a little odd
		//
		// there are two ways the following code can go:
		// 1. we have the file and we are done
		// 2. the file is a zip and we need to recurse
		//
		// this next line helps in the second case. Converting the one file
		// into a list is trivial, and always assuming we have a list (later)
		// means fewer exceptional cases
		file = {file: file};

		// are we recursing into zips?
		if(opts.recurse){
			// is this a zip file? Actually inspect the contents, don't rely on
			// MIME. MIME lies (jar/xul files), or is not always available.
			// Don't rely on extensions, user's lie.
			//
			// This is expensive, make sure recursing is on before doing the
			// inspections
			let iszip = await isZip(file.file);
			if(iszip){
				// unpack the zip
				file = file.file;
				file = await unZip(file,opts);
				//Object.values(file).forEach(file=>{
				//	file.relativePath = path + '/' + file.relativePath;
				//});
			}
		}

		// merge our discovered files into our returning list
		Object.values(file).forEach((file)=>{
			file.relativePath = zip.relativePath + '/' + file.relativePath;
			file.fullPath = file.relativePath + '/' + file.name;
			unpacked[file.fullPath] = file;
		});
	}
	return unpacked;
}

