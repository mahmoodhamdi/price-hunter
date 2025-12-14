"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Wallet,
  Clock,
  CheckCircle,
  Banknote,
  ArrowUpRight,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

interface CashbackSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  createdAt: string;
  paidAt?: string;
  store?: {
    name: string;
    logo: string | null;
  };
}

export default function CashbackDashboardPage() {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<CashbackSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    if (session?.user) {
      fetchCashbackData();
    }
  }, [session, statusFilter]);

  const fetchCashbackData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch("/api/cashback?type=summary");
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Fetch transactions
      const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const transactionsRes = await fetch(
        `/api/cashback?type=transactions${statusParam}`
      );
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions);
        setTotalTransactions(transactionsData.total);
      }

      // Fetch available for withdrawal
      const withdrawRes = await fetch("/api/cashback/withdraw");
      if (withdrawRes.ok) {
        const withdrawData = await withdrawRes.json();
        setAvailableForWithdrawal(withdrawData.available);
      }
    } catch (error) {
      console.error("Error fetching cashback data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Banknote className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading cashback data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Cashback Dashboard</h1>
          <p className="text-muted-foreground">
            Track your earnings and manage withdrawals
          </p>
        </div>
        <Button onClick={fetchCashbackData} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatPrice(summary.totalEarned, summary.currency) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary ? formatPrice(summary.totalPending, summary.currency) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary ? formatPrice(availableForWithdrawal, summary.currency) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary ? formatPrice(summary.totalPaid, summary.currency) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully withdrawn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      {availableForWithdrawal > 0 && (
        <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Wallet className="h-5 w-5" />
              Ready for Withdrawal
            </CardTitle>
            <CardDescription>
              You have {summary && formatPrice(availableForWithdrawal, summary.currency)} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="bg-green-600 hover:bg-green-700">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Request Withdrawal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How Cashback Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Shop via Price Hunter</p>
                <p className="text-sm text-muted-foreground">
                  Click through to stores from our site
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Complete Purchase</p>
                <p className="text-sm text-muted-foreground">
                  Buy at the store and cashback is tracked
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Get Paid</p>
                <p className="text-sm text-muted-foreground">
                  Withdraw after confirmation period
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transaction History</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start shopping via Price Hunter to earn cashback
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transaction.store?.name || "Unknown Store"}
                    </TableCell>
                    <TableCell>
                      {formatPrice(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalTransactions > transactions.length && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
