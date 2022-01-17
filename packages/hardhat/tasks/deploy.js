const { existsSync } = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { task } = require('hardhat/config');
const { TASK_COMPILE } = require('hardhat/builtin-tasks/task-names');
const { prompt } = require('enquirer');

const DEPLOYMENT_SCHEMA = {
  token: '',
};

task('deploy', 'Deploys the Ethernauts NFT contract')
  .addFlag('noConfirm', 'Ask for confirmation before deployment')
  .addFlag('noVerify', 'Verify contract using Etherscan API')
  .addFlag('clear', 'Clear existing deployment before executing')
  .addOptionalParam(
    'urlChanger',
    'Private key of the address that will be allowed to call Ethernauts.setBaseUri (meant to be used by the keeper)'
  )
  .setAction(async ({ noConfirm, noVerify, clear, urlChanger }, hre) => {
    await hre.run(TASK_COMPILE, { force: true, quiet: true });

    const signer = await _getSignerAddress();
    console.log();
    console.log('-- Deploying Ethernauts Contract --');
    console.log(`Network: ${hre.network.name}`);
    console.log(`Signer: ${signer}`);

    const deploymentPath = `./deployments/${hre.network.name}.json`;
    const data = await _loadOrCreateDeploymentFile(deploymentPath);

    if (data.token && !clear) {
      throw new Error(`Token already exists at ${data.token}`);
    }

    const constructorParams = {
      ...hre.config.defaults,
      initialCouponSigner: signer,
      initialUrlChanger: urlChanger || hre.config.defaults.initialUrlChanger,
    };

    if (!noConfirm) {
      await _confirmParameters(constructorParams);
    }

    const constructorArgs = await _parseConstructorArguments(constructorParams);
    const Ethernauts = await _deployContract(constructorArgs);
    console.log(`Deployed at: ${Ethernauts.address}`);

    data.token = Ethernauts.address;
    await fs.writeFile(deploymentPath, JSON.stringify(data, null, 2));

    if (!noVerify) {
      await _verifyContract(Ethernauts.address, constructorArgs);
    }
  });

async function _parseConstructorArguments(params = {}) {
  const factory = await hre.ethers.getContractFactory('Ethernauts');

  // Get the names of all the required params on the constructor from the ABI
  const paramNames = JSON.parse(factory.interface.format(hre.ethers.utils.FormatTypes.json))
    .find(({ type }) => type === 'constructor')
    .inputs.map(({ name }) => name);

  // Create an array with the constructor params in correct order
  return paramNames.reduce((constructorArgs, paramName) => {
    if (!params[paramName]) {
      throw new Error(`Missing constructor parameter "${paramName}"`);
    }

    constructorArgs.push(params[paramName]);

    return constructorArgs;
  }, []);
}

async function _getSignerAddress() {
  return (await hre.ethers.getSigners())[0].address;
}

async function _verifyContract(contractAddress, constructorArguments) {
  if (!process.env.ETHERSCAN_API) {
    throw new Error('Missing ETHERSCAN_API configuration');
  }

  await hre.run('verify:verify', {
    address: contractAddress,
    apiKey: `${process.env.ETHERSCAN_API}`,
    constructorArguments,
  });

  console.log('Verified!');
}

async function _confirmParameters(constructorParams) {
  console.log('Constructor arguments:', constructorParams);
  await prompt({
    type: 'confirm',
    name: 'question',
    message: 'Continue?',
  });
  console.log();
}

async function _deployContract(constructorArguments) {
  const factory = await hre.ethers.getContractFactory('Ethernauts');
  const Ethernauts = await factory.deploy(...constructorArguments, hre.config.overrides);

  console.log('Submitted transaction:', Ethernauts.deployTransaction.hash);

  const receipt = await Ethernauts.deployTransaction.wait();

  console.log('Deployment receipt:', {
    blockHash: receipt.blockHash,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    confirmations: receipt.confirmations,
    gasUsed: hre.ethers.utils.formatEther(receipt.gasUsed),
    cumulativeGasUsed: hre.ethers.utils.formatEther(receipt.cumulativeGasUsed),
    effectiveGasPrice: hre.ethers.utils.formatEther(receipt.effectiveGasPrice),
  });

  return Ethernauts;
}

async function _loadOrCreateDeploymentFile(filepath) {
  if (existsSync(filepath)) {
    return JSON.parse(await fs.readFile(filepath));
  } else {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    return DEPLOYMENT_SCHEMA;
  }
}
