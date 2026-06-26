import { Innertube, Platform, Log } from 'youtubei.js';

// Suppress youtubei.js library logs (Parser warnings, Text parse warnings, etc.)
Log.setLevel(Log.Level.ERROR);

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

// Maintain cached instances on global to survive Next.js hot-reloads in development
let ytInstancePromise = global.ytInstancePromise || null;
let ytInstance = global.ytInstance || null;
let lastUsedCookies = global.ytLastUsedCookies || null;

export async function getYtInstance() {
  const currentCookies = process.env.YOUTUBE_COOKIES || '';
  
  if (lastUsedCookies !== currentCookies) {
    ytInstance = null;
    ytInstancePromise = null;
    if (typeof global !== 'undefined') {
      global.ytInstance = null;
      global.ytInstancePromise = null;
    }
  }

  if (ytInstance) {
    return ytInstance;
  }

  if (!ytInstancePromise) {
    const config = {};
    if (currentCookies) {
      config.cookies = currentCookies;
    }
    
    lastUsedCookies = currentCookies;
    if (typeof global !== 'undefined') {
      global.ytLastUsedCookies = currentCookies;
    }

    ytInstancePromise = Innertube.create(config).then((instance) => {
      ytInstance = instance;
      if (typeof global !== 'undefined') {
        global.ytInstance = instance;
        global.ytInstancePromise = ytInstancePromise;
      }
      return instance;
    }).catch((err) => {
      ytInstancePromise = null;
      if (typeof global !== 'undefined') {
        global.ytInstancePromise = null;
      }
      throw err;
    });

    if (typeof global !== 'undefined') {
      global.ytInstancePromise = ytInstancePromise;
    }
  }

  return ytInstancePromise;
}
