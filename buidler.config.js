usePlugin("@nomiclabs/buidler-truffle5");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(account);
  }
});

module.exports = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.5.16",
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
