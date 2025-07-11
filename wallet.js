const { TelegramWebApp } = window;
TelegramWebApp.ready();

const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/XwpzZbKC4DmHClwsC3DW6');
let wallet = null;

// Load existing wallet
const privateKey = localStorage.getItem('tokenRadarPrivateKey');
if (privateKey) {
    wallet = new ethers.Wallet(privateKey, provider);
    document.getElementById('address').innerText = `Address: ${wallet.address}`;
    document.getElementById('createWallet').disabled = true;
    document.getElementById('snipeButton').disabled = false;
    updateBalance();
}

// Create new wallet
document.getElementById('createWallet').addEventListener('click', async () => {
    wallet = ethers.Wallet.createRandom();
    localStorage.setItem('tokenRadarPrivateKey', wallet.privateKey);
    document.getElementById('address').innerText = `Address: ${wallet.address}`;
    document.getElementById('createWallet').disabled = true;
    document.getElementById('snipeButton').disabled = false;
    updateBalance();
    TelegramWebApp.sendData(JSON.stringify({ action: 'walletCreated', address: wallet.address }));
    document.getElementById('status').innerText = 'Wallet created! Save your private key securely.';
});

// Export private key
document.getElementById('exportWallet').addEventListener('click', () => {
    if (wallet) {
        document.getElementById('status').innerText = `Private Key: ${wallet.privateKey}\nSAVE THIS SECURELY!`;
    } else {
        document.getElementById('status').innerText = 'No wallet to export.';
    }
});

// Update balance
async function updateBalance() {
    if (wallet) {
        const balance = await provider.getBalance(wallet.address);
        document.getElementById('balance').innerText = `Balance: ${ethers.utils.formatEther(balance)} ETH`;
    }
}

// Snipe token
document.getElementById('snipeButton').addEventListener('click', async () => {
    const amount = document.getElementById('snipeAmount').value;
    const tokenAddress = new URLSearchParams(window.location.search).get('token');
    if (!wallet || !amount || !tokenAddress) {
        document.getElementById('status').innerText = 'Error: Missing wallet, amount, or token.';
        return;
    }
    const router = new ethers.Contract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', [
        {
            "inputs": [
                {"name": "amountOutMin", "type": "uint256"},
                {"name": "path", "type": "address[]"},
                {"name": "to", "type": "address"},
                {"name": "deadline", "type": "uint256"}
            ],
            "name": "swapExactETHForTokens",
            "outputs": [{"name": "amounts", "type": "uint256[]"}],
            "stateMutability": "payable",
            "type": "function"
        }
    ], wallet);
    try {
        const tx = await router.swapExactETHForTokens(
            0,
            ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', tokenAddress],
            wallet.address,
            Math.floor(Date.now() / 1000) + 600,
            { value: ethers.utils.parseEther(amount), gasLimit: 200000 }
        );
        document.getElementById('status').innerText = `Snipe TX sent: ${tx.hash}`;
        TelegramWebApp.sendData(JSON.stringify({ action: 'snipeSent', txHash: tx.hash }));
    } catch (e) {
        document.getElementById('status').innerText = `Error: ${e.message}`;
    }
});

TelegramWebApp.onEvent('mainButtonClicked', () => {
    TelegramWebApp.sendData(JSON.stringify({ action: 'refresh' }));
});