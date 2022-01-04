/*
const prompt = require('like-prompt')

const name = await prompt.question('What is your name?')
*/

const readline = require('readline')

// + not optimized for recurrent usage

module.exports = {
  question
}

function question (query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(query, response => {
      rl.close()
      resolve(response)
    })
  })
}
