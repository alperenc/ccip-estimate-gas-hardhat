import { ethers, run, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the TransferUSDC contract on a specified network.
 * @param network The network where the TransferUSDC contract will be deployed.
 */
async function deployAndVerifySender(network: SupportedNetworks) {
    // Retrieve router and linkToken addresses for the specified network.
    const { router, linkToken, usdcToken } = getCCIPConfig(network);

    console.log(`Deploying TransferUSDC contract on ${network}...`);
    // Create a contract factory for the "TransferUSDC" contract.
    const TransferUSDC = await ethers.getContractFactory("TransferUSDC");
    // Deploy the TransferUSDC contract with router and linkToken as constructor arguments.
    const sender = await TransferUSDC.deploy(router, linkToken, usdcToken);

    // Wait for the contract deployment transaction to be mined.
    await sender.waitForDeployment();
    // Retrieve the transaction used for deploying the contract.
    const tx = sender.deploymentTransaction();
    if (tx) {
        console.log("wait for 20 blocks");
        // Wait for 5 confirmations to ensure the transaction is well-confirmed on the network.
        await tx.wait(5);

        // Get the deployed contract address.
        const senderAddress = await sender.getAddress();
        console.log("TransferUSDC contract deployed at:", senderAddress);

        console.log(`Verifying TransferUSDC contract on ${network}...`);
        try {
            // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
            await run("verify:verify", {
                address: senderAddress,
                constructorArguments: [router, linkToken, usdcToken],
            });
            console.log(`TransferUSDC contract verified on ${network}!`);
        } catch (error) {
            console.error("Error verifying TransferUSDC contract:", error);
        }

        // Update the configuration file with the new contract address.
        await createOrUpdateConfigFile(network, { senderAddress });
    }
}

// Execute the deployment and verification process for the current network.
deployAndVerifySender(network.name as SupportedNetworks).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});