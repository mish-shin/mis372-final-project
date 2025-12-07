import express from 'express';
import cors from 'cors';
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';


dotenv.config();


const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',               // for Render.com PostgreSQL
  logging: false,
 dialectOptions: {
     ssl: { require: true, rejectUnauthorized: false }  // for Render.com PostgreSQL
 }
});

const app = express();
app.use(cors());
app.use(express.json());

const Account = sequelize.define('Account', {
  account_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  user_id: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  account_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'accounts',
  timestamps: false,
  underscored: true
});


const Transaction = sequelize.define('Transaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false
    // FK handled via association below
  },

  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },

  transaction_type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['deposit', 'withdraw']]
    }
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: false,
  underscored: true
});

Account.hasMany(Transaction, { foreignKey: 'account_id' });
Transaction.belongsTo(Account, { foreignKey: 'account_id' });

// function generateAccountNumber() {
//   // Simple 10-digit random number as a string
//   return Array.from({ length: 10 }, () => 
//     Math.floor(Math.random() * 10)
//   ).join('');
// }

async function generateUniqueAccountNumber() {
  for (let i = 0; i < 5; i++) {     // try up to 5 times
    const candidate = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');

    const existing = await Account.findOne({
      where: { account_number: candidate }
    });

    if (!existing) return candidate;
  }

  throw new Error("Failed to generate unique account number after 5 attempts");
}

app.post('/api/accounts', async (req, res) => {
  try {
    const { user_id, name } = req.body;

    // Basic validation
    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required.' });
    }

    const account_number = await generateUniqueAccountNumber();

    const account = await Account.create({
      user_id,
      name,
      account_number
    });

    return res.status(201).json(account);

  } catch (err) {
    console.error('Error creating account:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res
        .status(409)
        .json({ error: 'Generated account number already exists. Try again.' });
    }

    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/accounts/dev', async (req, res) => {
  try {
    const accounts = await Account.findAll();
    return res.json(accounts);
  } catch (err) {
    console.error("Error fetching accounts:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const accounts = await Account.findAll({
      where: { user_id }
    });

    res.json(accounts);

  } catch (err) {
    console.error("Error fetching accounts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.get('/api/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // 1️⃣ Get the account itself
    const account = await Account.findByPk(accountId);

    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // 2️⃣ Fetch transactions and compute balance
    const transactions = await Transaction.findAll({
  where: { account_id: accountId },
  order: [['created_at', 'DESC']]
});

    const balance = transactions.reduce((total, tx) => {
      if (tx.transaction_type === "deposit") return total + Number(tx.amount);
      if (tx.transaction_type === "withdraw") return total - Number(tx.amount);
      return total;
    }, 0);

    // 3️⃣ Build response object
    const response = {
      ...account.toJSON(),
      balance, 
      transactions
    };

    return res.json(response);

  } catch (err) {
    console.error("Error fetching account:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.post('/api/accounts/:accountId/deposit', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0." });
    }

    // 1️⃣ Make sure account exists
    const account = await Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // 2️⃣ Create a transaction
    await Transaction.create({
      account_id: accountId,
      amount,
      transaction_type: "deposit",
      description
    });

    // 3️⃣ Get updated balance
    const transactions = await Transaction.findAll({
      where: { account_id: accountId }
    });

    const balance = transactions.reduce((total, tx) => {
      if (tx.transaction_type === "deposit") return total + Number(tx.amount);
      if (tx.transaction_type === "withdraw") return total - Number(tx.amount);
      return total;
    }, 0);

    return res.status(201).json({
      message: "Deposit successful.",
      balance
    });

  } catch (err) {
    console.error("Deposit error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});


app.post('/api/accounts/:accountId/withdraw', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0." });
    }

    // 1️⃣ Confirm account exists
    const account = await Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // 2️⃣ Compute current balance
    const transactions = await Transaction.findAll({
      where: { account_id: accountId }
    });

    const balance = transactions.reduce((total, tx) => {
      if (tx.transaction_type === "deposit") return total + Number(tx.amount);
      if (tx.transaction_type === "withdraw") return total - Number(tx.amount);
      return total;
    }, 0);

    // 3️⃣ Prevent overdraft
    if (amount > balance) {
      return res.status(400).json({
        error: "Insufficient funds.",
        balance
      });
    }

    // 4️⃣ Create withdrawal transaction
    await Transaction.create({
      account_id: accountId,
      amount,
      transaction_type: "withdraw",
      description
    });

    // 5️⃣ Compute updated balance
    const newBalance = balance - Number(amount);

    return res.status(201).json({
      message: "Withdrawal successful.",
      balance: newBalance
    });

  } catch (err) {
    console.error("Withdrawal error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// SAFE DELETE: Prevent deleting accounts with remaining balance
app.delete('/api/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Validate accountId
    if (!accountId || isNaN(Number(accountId))) {
      return res.status(400).json({ error: "Invalid accountId parameter." });
    }

    // 1️⃣ Look up the account
    const account = await Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // 2️⃣ Get all transactions for this account
    const transactions = await Transaction.findAll({
      where: { account_id: accountId }
    });

    // 3️⃣ Compute balance
    const balance = transactions.reduce((total, tx) => {
      if (tx.transaction_type === "deposit") return total + Number(tx.amount);
      if (tx.transaction_type === "withdraw") return total - Number(tx.amount);
      return total;
    }, 0);

    // 4️⃣ Prevent deletion unless balance is exactly zero
    if (balance !== 0) {
      return res.status(400).json({
        error: "Cannot delete account with a non-zero balance.",
        balance: balance,
        message: "Please withdraw or transfer all remaining money before closing this account."
      });
    }

    // 5️⃣ Delete transactions FIRST (safe since balance is 0)
    await Transaction.destroy({
      where: { account_id: accountId }
    });

    // 6️⃣ Now delete the account
    await Account.destroy({
      where: { account_id: accountId }
    });

    return res.json({ message: "Account deleted successfully." });

  } catch (err) {
    console.error("Error deleting account:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});



app.use((req, res, next) => {
    console.log(`${req.method} request made at ${req.url} -- Body: ${JSON.stringify(req.body)}`);
    next();
})



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});