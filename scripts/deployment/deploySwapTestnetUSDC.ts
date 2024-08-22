import { ethers, run, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the SwapTestnetUSDC contract on a specified network.
 * @param network The network where the SwapTestnetUSDC contract will be deployed.
 */
async function deployAndVerifySwapper(network: SupportedNetworks) {
    // Retrieve usdcToken, compoundUsdcToken and fauceteer addresses for the specified network.
    const { usdcToken, compoundUsdcToken, fauceteer } = getCCIPConfig(network);

    console.log(`Deploying SwapTestnetUSDC contract on ${network}...`);
    // Create a contract factory for the "SwapTestnetUSDC" contract.
    const SwapTestnetUSDC = await ethers.getContractFactory("SwapTestnetUSDC");
    // Deploy the SwapTestnetUSDC contract with usdcToken, compoundUsdcToken and fauceteer as constructor arguments.
    const swapper = await SwapTestnetUSDC.deploy(usdcToken, compoundUsdcToken, fauceteer);

    // Wait for the contract deployment transaction to be mined.
    await swapper.waitForDeployment();
    // Retrieve the transaction used for deploying the contract.
    const tx = swapper.deploymentTransaction();
    if (tx) {
        console.log("wait for 5 blocks");
        // Wait for 20 confirmations to ensure the transaction is well-confirmed on the network.
        await tx.wait(5);

        // Get the deployed contract address.
        const swapperAddress = await swapper.getAddress();
        console.log("Swapper contract deployed at:", swapperAddress);

        console.log(`Verifying Swapper contract on ${network}...`);
        try {
            // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
            await run("verify:verify", {
                address: swapperAddress,
                constructorArguments: [usdcToken, compoundUsdcToken, fauceteer],
            });
            console.log(`Swapper contract verified on ${network}!`);
        } catch (error) {
            console.error("Error verifying Swapper contract:", error);
        }

        // Update the configuration file with the new contract address.
        await createOrUpdateConfigFile(network, { swapperAddress });
    }
}

// Execute the deployment and verification process for the current network.
deployAndVerifySwapper(network.name as SupportedNetworks).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});