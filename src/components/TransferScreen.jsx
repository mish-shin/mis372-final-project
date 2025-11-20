import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export function MoneyActionsScreen() {
  const [message, setMessage] = useState(null);

  function handleSubmit(type) {
    return (e) => {
      e.preventDefault();
      // For now just show a fake confirmation.
      // Later you can call your API here.
      const pretty =
        type === 'transfer'
          ? 'Transfer'
          : type === 'deposit'
          ? 'Deposit'
          : 'Withdrawal';

      setMessage(`${pretty} submitted successfully (UI only right now).`);
    };
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6 min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Move Money</h2>
          <p className="text-slate-600">
            Transfer between accounts, make deposits, and withdraw funds
          </p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {/* 3 main actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Transfer Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </span>
              Transfer
            </CardTitle>
            <p className="text-sm text-slate-500">
              Move money between your own accounts.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit('transfer')}>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">From account</p>
                <Select defaultValue="checking">
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">To account</p>
                <Select defaultValue="savings">
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">Amount</p>
                <Input type="number" min="0" step="0.01" placeholder="0.00" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">Memo (optional)</p>
                <Input placeholder="Rent, savings, etc." />
              </div>

              <Button type="submit" className="w-full mt-2">
                Review Transfer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deposit Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              </span>
              Deposit
            </CardTitle>
            <p className="text-sm text-slate-500">
              Add money into one of your accounts.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit('deposit')}>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">To account</p>
                <Select defaultValue="checking">
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">Amount</p>
                <Input type="number" min="0" step="0.01" placeholder="0.00" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">
                  Deposit source
                </p>
                <Select defaultValue="paycheck">
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paycheck">Paycheck</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-2">
                Review Deposit
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Withdraw Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              </span>
              Withdraw
            </CardTitle>
            <p className="text-sm text-slate-500">
              Take money out of one of your accounts.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit('withdraw')}>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">From account</p>
                <Select defaultValue="checking">
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">Amount</p>
                <Input type="number" min="0" step="0.01" placeholder="0.00" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">
                  Withdrawal method
                </p>
                <Select defaultValue="atm">
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atm">ATM</SelectItem>
                    <SelectItem value="branch">In-branch</SelectItem>
                    <SelectItem value="external">
                      External transfer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-2" variant="destructive">
                Review Withdrawal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
