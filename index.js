const _ = require('lodash')
const prompt = require('prompt');
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

const numberToLetters = i => {
  if (i >= ALPHABET.length) {
    const firstLetter = Math.floor(i / ALPHABET.length)
    const secondLetter = i - ALPHABET.length * firstLetter
    return `${ALPHABET[firstLetter]}${ALPHABET[secondLetter]}`
  }
  return ALPHABET[i]
}

const lettersToNumber = letters => {
  if (letters.length === 2) {
    const firstLetter = ALPHABET.indexOf(letters[0])
    const secondLetter = ALPHABET.indexOf(letters[1])
    return firstLetter * ALPHABET.length + secondLetter
  } else if (letters.length === 1) {
    return ALPHABET.indexOf(letters[0])
  }
}


// Error that should be thrown to exit to the start of the application
function DontContinue(message) {
  this.name = 'DontContinue';
  this.message = message || '';
  // this.stack = (new Error()).stack;
}
DontContinue.prototype = Object.create(Error.prototype);
DontContinue.prototype.constructor = DontContinue;


// Error that should be thrown to exit the script completely
function ExitScript(message) {
  this.name = 'ExitScript';
  this.message = message || '';
  // this.stack = (new Error()).stack;
}
ExitScript.prototype = Object.create(Error.prototype);
ExitScript.prototype.constructor = ExitScript;


// Parse all passed arguments as a map
const ARGS = (() => {
  const args = {}
  let lastArg
  for (let i = 0, max = process.argv.length; i < max; i++) {
    const originalArg = process.argv[i]
    if (originalArg.indexOf('--') === 0) {
      const arg = originalArg.substring(2)
      args[arg] = []
      lastArg = arg
    } else if (lastArg) {
      args[lastArg].push(originalArg)

      // First two args are irrelevant as they are path to node process and the script file itself
      // However, store all other possible arguments before --arg is found
    } else if (i >= 2) {
      if (!args['root']) {
        args['root'] = []
      }
      args['root'].push(originalArg)
    }
  }

  const argsStringified = _.map(args, (params, arg) => {
    let addition = ''
    if (params.length) {
      addition = `: [${params.join(', ')}]`
    }
    return `${arg}${addition}`
  }).join(', ')
  console.log('Launched with args:', argsStringified)

  return args
})()

/**
 * Prompt options and return selected key, or null if default. The prompt will repeat
 * itself if selection was not recognized
 *
 * @param  {String} text (optional)  Question to print out first
 * @param  {[type]} optionMap        Map or array of options, format: {<key>: "<description>"} or [key1, key2, ...]
 * @param  {String} defaultOptionArg Description of the default option
 * @return {[type]}                  key or null if default selected
 */
function promptOptions(text, optionMap, defaultOptionText = '') {
  let options = optionMap
  let defaultOption = defaultOptionText

  if (typeof text === 'object') {
    options = text
    defaultOption = optionMap || ''
  } else {
    console.log("\n" + text)
  }

  const optionKeys = Object.keys(options)

  optionKeys.forEach((optionKey, i) => {
    console.log(`${numberToLetters(i)}) ${options[optionKey]}`)
  })
  console.log("q) Quit")
  if (defaultOption) {
    console.log('(default): ' + defaultOption)
  }
  return promptFields()
    .then(rawRes => {
      const res = rawRes && rawRes.toLowerCase()

      let selectedOption
      const i = lettersToNumber(res)

      // Only return null if defaultOptionText was specified
      if (!res && defaultOption) {
        selectedOption = null
      } else if (i !== -1 && i < optionKeys.length) {
        // As options can be array of keys or an object, return the key of the selections
        selectedOption = options instanceof Array ? options[i] : optionKeys[i]
      } else if (res === 'q') {
        throw new DontContinue()
      } else {
        console.log('Please select one of the options!')
        return promptOptions(text, optionMap, defaultOptionText)
      }

      return selectedOption
    })
}

// make a simple deferred/promise out of the prompt function
const initPrompter = _.once(() => {
  prompt.start();
  prompt.message = "";
})

const startWith = (initialQuestion, initialOptions, initialHandler) => {
  return promptOptions(initialQuestion, initialOptions)
    .catch(err => {
      if (err instanceof DontContinue) {
        throw new ExitScript()
      }
      throw err
    })
    .then(initialHandler)
    .then(() => { console.log("\n" + 'All DONE!') })
    .catch(err => {
      if (err.message === 'canceled') {
        throw new ExitScript()
      }

      if (err instanceof ExitScript) {
        if (err.message) {
          console.log("\n" + err.message)
        }
        // exit if requested
        throw err

      } else if (err instanceof DontContinue) {
        if (err.message) {
          console.log("\n" + err.message)
        }

      } else {
        // report error and restart from beginning
        console.error('ERROR:', err.message, err.code, err.stack);
      }
    })
    .then(() => startWith(initialQuestion, initialOptions, initialHandler))
}

const onFinalError = err => {
  if (err instanceof ExitScript) {
    return
  }
  console.log('THIS SHOULD NEVER APPEAR', err.code, err.message, err)
}

const exit = () => process.exit()


/**
 * Ask user a question or entries to multiple questions
 * @param  {String} textArg (optional)  Description
 * @param  {String or Array} fieldsArg  Single field (String) or multiple fields (Array) to fill
 * @return {Promise({String})}          Single response (String) or multiple responses (Object<key, response>)
 */
const promptFields = function (textArg, fieldsArg) {
  initPrompter()
  let text
  let fields
  if (typeof textArg !== 'string') {
    fields = textArg || '?'
    text = null
  } else {
    text = textArg
    fields = fieldsArg || '?'
  }
  if (text) {
    console.log("\n" + text);
  }
  return new Promise(function (resolve, reject) {

    if (_.isArray(fields)) {
      prompt.get(fields, function (err, value) {
        if (err) {
          return reject(err)
        }
        resolve(value);
      });
    } else if (_.isString(fields)) {
      prompt.get([fields], function (err, value) {
        if (err) {
          return reject(err)
        }
        if (!value) {
          return resolve();
        }
        resolve(value[fields].trim());
      });
    } else {
      reject(new Error('[fields] array should be of type String or Array, given ' + typeof fields));
    }

  });
};

const promptToContinue = function (obj) {
  return promptFields(['continue? (y/n)']).then(function (res) {
    if (res['continue? (y/n)'].toLowerCase() == 'y') {
      return obj;
    } else {
      throw new DontContinue('Aborted');
    }
  });
};

const promptPassword = function () {
  return new Promise((resolve, reject) => {
    prompt.get([{
      hidden: true,
      name: 'password',
    }], function (err, data) {
      if (err) {
        return reject(err)
      }
      resolve(data.password)
    })
  })
}


module.exports = {
  prompt,
  promptFields,
  promptPassword,
  promptToContinue,
  promptOptions,
  startWith,
  onFinalError,
  exit,
  getArgs: () => ARGS,
  ExitScript,
  DontContinue,
}
