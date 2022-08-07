const core = require("@actions/core")
const github = require("@actions/github");

async function run() {
  try {
    const nameToGreet = core.getInput("who-to-greet")
    console.log(`Hello ${nameToGreet}`)
    const time = new Date().toTimeString()
    core.setOutput("time", time)
  
    // get the JSON webhook payload
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)
  } catch (error) {
    if (typeof error === "string") {
      core.setFailed(error.toUpperCase())
    } else if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run.then(() => "hello_world Complete!").catch(() => console.error("hello_world Failed!"))