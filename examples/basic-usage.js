const {
  prompt,
  promptToContinue,
  promptOptions,
  startWith,
  onFinalError,
  exit,
  DontContinue,
} = require('../')


new Promise((resolve, reject) => {
  // Do some preparation, such as getting
  // a reference to a database or authenticating
  resolve({
    createUser: () => Promise.resolve(),
    listUsers: () => Promise.resolve({
      "31725276-73a9-4830-aa77-a86fce4dd7f8": "Leonardo DiCaprio",
      "53bd3330-4bd7-47c5-a685-f1039e043eae": "Jennifer Lopez"
    }),
    deleteUser: () => Promise.resolve(),
  })
})
.then(api => {
  const initialOptions = {
    createUser: "Create a new user",
    deleteUser: "Delete a user"
  }
  const handler = (selection) => {
    switch (selection) {
      case 'createUser':
        return createUser(api)

      case 'deleteUser':
        return deleteUser(api)

      default: {
        throw new ExitScript(`Unknown selection "${selection}"`)
      }
    }
  }

  return startWith("Would you like to", initialOptions, handler)
})
.catch(onFinalError)
.then(exit)

function createUser (api) {
  const user = {}
  return prompt("Enter user's email", "email")
  .then(email => { user.email = email })

  .then(() => prompt("What's the name for the user", ["firstname", "lastname"]))
  .then(res => {
    user.firstname = res.firstname
    user.lastname = res.lastname
  })

  .then(() => {
    return api.createUser(user)
    .catch(err => {
      throw DontContinue("User could not be created because of error: " + err.message)
    })
  })

  .then(() => {
    console.log(`User ${user.firstname} ${user.lastname} was created successfully!`)
  })

}

function deleteUser (api) {
  const data = {}
  return api.listUsers()
  .then(users => {
    data.users = users;
    return users
  })
  .then(users => promptOptions("Which user would you like to delete?", users))
  .then(selection => {
    data.selection = selection
    return selection
  })
  .then(selection => {
    console.log("\n" + 'Are you absolutely sure?')
    return promptToContinue(selection)
  })
  .then(selection => {
    api.deleteUser(selection)
  })
  .then(() => {
    console.log(`User ${data.users[data.selection]} was successfully deleted!`)
  })
}
