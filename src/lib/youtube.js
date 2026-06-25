import { Innertube, Platform } from 'youtubei.js';

// Configure the custom JavaScript evaluator for youtubei.js signature deciphering
if (Platform.shim) {
  Platform.shim.eval = async (data, env) => {
    const properties = [];
    if (env.n) {
      properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }
    if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }
    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
    return new Function(code)();
  };
}

let ytInstancePromise = null;
let ytInstance = null;
let lastUsedCookies = null;

export async function getYtInstance() {
  const currentCookies = process.env.YOUTUBE_COOKIES || '';
  
  if (lastUsedCookies !== currentCookies) {
    ytInstance = null;
    ytInstancePromise = null;
  }

  if (ytInstance) {
    return ytInstance;
  }

  if (!ytInstancePromise) {
    const config = {};
    if (currentCookies) {
      config.cookies = currentCookies;
      console.log('[youtube] Initializing Innertube with YOUTUBE_COOKIES');
    } else {
      console.log('[youtube] Initializing Innertube without cookies (guest session)');
    }
    
    lastUsedCookies = currentCookies;
    ytInstancePromise = Innertube.create(config).then((instance) => {
      ytInstance = instance;
      return instance;
    }).catch((err) => {
      ytInstancePromise = null; // Reset on failure
      throw err;
    });
  }

  return ytInstancePromise;
}
