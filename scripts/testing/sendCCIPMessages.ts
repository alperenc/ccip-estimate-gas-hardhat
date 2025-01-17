import { ethers, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

// This function is designed to send CCIP messages across networks using the deployed Sender contract.
async function sendCCIPMessages(currentNetwork: SupportedNetworks) {
  // Retrieve the current signer to use for transactions.
  const [signer] = await ethers.getSigners();

  // Retrieve the Sender contract's instance using its address for the current network.
  const senderAddress = (
    deployedContracts[currentNetwork] as { sender: string }
  ).sender;
  // Retrieve the address of the LINK token for the current network.
  const linkTokenAddress = getCCIPConfig(currentNetwork).linkToken;
  // Retrieve the address of the USDC token for the current network.
  const usdcTokenAddress = getCCIPConfig(currentNetwork).usdcToken;
  // Instantiate the Sender, LINK token and USDC token contracts for interaction.
  const sender = await ethers.getContractAt("TransferUSDC", senderAddress, signer);
  const linkToken = await ethers.getContractAt(
    "BurnMintERC677",
    linkTokenAddress
  );
  const usdcToken = await ethers.getContractAt("IERC20", usdcTokenAddress);

  // Approve the LINK token contract to spend tokens on behalf of the sender contract.
  console.log(
    `Approving ${linkTokenAddress} for ${senderAddress}. Allowance is ${ethers.MaxUint256}. Signer ${signer.address}...`
  );
  let tx = await linkToken.approve(senderAddress, ethers.MaxUint256);
  // Wait for the transaction to be confirmed with 5 block confirmations.
  await tx.wait(5);
  console.log(`Approved!`)

  const balance = await usdcToken.balanceOf(signer.address);
  console.log(balance)

  // // Approve the USDC token contract to spend tokens on behalf of the sender contract.
  // console.log(
  //   `Approving ${usdcTokenAddress} for ${senderAddress}. Allowance is ${ethers.MaxUint256}. Signer ${signer.address}...`
  // );
  // tx = await usdcToken.approve(senderAddress, ethers.MaxUint256);
  // // Wait for the transaction to be confirmed with 5 block confirmations.
  // await tx.wait(5);
  // console.log(`Approved!`)

  // Define parameters for the test messages to be sent.
  // const testParams = [
  //   { iterations: 0, amount: 1000000, gasLimit: 5685 }, // Scenario with minimum iterations
  //   { iterations: 50, amount: 1000000, gasLimit: 16190 }, // Scenario with average iterations
  //   { iterations: 99, amount: 1000000, gasLimit: 26485 }, // Scenario with maximum iterations
  // ];

  const prodParams = [
    { iterations: 0, amount: 1000000, gasLimit: 180970 }, // Adjusted gasLimit (gasUsed * 1.10) to be used in production
  ];

  // Initialize an array to store the IDs of the sent messages.
  const messageIds = [];

  // Loop through each network defined in the deployedContracts to send messages.
  for (const network in deployedContracts) {
    const supportedNetwork = network as SupportedNetworks;
    // Retrieve the receiver's address.
    const receiver = (
      deployedContracts[supportedNetwork] as { receiver: string }
    ).receiver;

    // Check if a receiver is defined for the current network.
    if (receiver) {
      // Retrieve the chain selector ID for the destination network.
      const destinationChainSelector =
        getCCIPConfig(supportedNetwork).chainSelector;

      // Send messages with different iterations and gas limits.
      for (const { iterations, amount, gasLimit } of prodParams) {
        tx = await sender.transferUsdc(
          destinationChainSelector,
          receiver,
          iterations,
          amount,
          gasLimit
        );
        // Wait for the transaction confirmation with 5 block confirmations.
        const receipt = await tx.wait(5);

        // After confirmation, parse the transaction receipt logs to extract message IDs.
        if (receipt) {
          for (const log of receipt.logs) {
            try {
              // Attempt to parse the log using the Sender contract's interface.
              const parsedLog = sender.interface.parseLog(log);
              // If the log is related to a message being sent, store its ID.
              if (parsedLog && parsedLog.name === "UsdcTransferred") {
                const messageId = parsedLog.args.messageId;

                messageIds.push({
                  iterations,
                  gasLimit,
                  messageId,
                });
              }
            } catch (error) {
              // This log is not part of the contract, ignore it
            }
          }
        }
      }
    }
  }

  // Log the IDs of all messages that were successfully sent.
  messageIds.forEach(({ iterations, gasLimit, messageId }) => {
    console.log(
      `Number of iterations ${iterations} - Gas limit: ${gasLimit} - Message Id: ${messageId}`
    );
  });
}

// Execute the sendCCIPMessages function with the current network.
sendCCIPMessages(network.name as SupportedNetworks).catch((error) => {
  console.error("Error occurred:", error);
  process.exit(1);
});
