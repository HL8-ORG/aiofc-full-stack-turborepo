'use client';

import Loading from '@/components/Loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { useGetTransactionsQuery } from '@/state/api';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

import React, { useState, useEffect } from 'react';

const UserBilling = () => {
  const [paymentType, setPaymentType] = useState('all');
  const { user } = useAuthStore();
  const router = useRouter();

  // 为调试记录用户信息
  useEffect(() => {
    console.log('🔍 账单页面 - 当前用户信息:', {
      user,
      userId: user?.id,
      id: user?.id,
      email: user?.email
    });
  }, [user]);

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    isError,
    error
  } = useGetTransactionsQuery(user?.id || '', {
    skip: !user?.id, // 如果没有userId则跳过查询
  });

  // 错误详细日志
  useEffect(() => {
    if (isError) {
      console.error('❌ getTransactions 错误:', error);
    }
  }, [isError, error]);

  const filteredData =
    transactions?.filter((transaction) => {
      const matchesTypes = paymentType === 'all' || transaction.paymentProvider === paymentType;
      return matchesTypes;
    }) || [];

  if (!user) {
    console.log('⚠️ 用户信息不存在 - 重定向到登录页面');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">需要登录</h2>
        <p className="text-muted-foreground">请登录以查看支付记录。</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          去登录
        </button>
      </div>
    );
  }

  if (!user.id) {
    console.log('⚠️ userId不存在:', user);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">用户信息错误</h2>
        <p className="text-muted-foreground">用户信息有问题，请重新登录。</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新登录
        </button>
      </div>
    );
  }

  if (isError) {
    console.error('❌ 支付记录加载错误:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">无法加载支付记录</h2>
        <p className="text-muted-foreground">发生网络错误，请刷新页面。</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          刷新
        </button>
      </div>
    );
  }

  return (
    <div className="billing">
      <div className="billing__container">
        <h2 className="billing__title">Payment History</h2>
        <div className="billing__filters">
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className="billing__select">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>

            <SelectContent className="billing__select-content">
              <SelectItem className="billing__select-item" value="all">
                All Types
              </SelectItem>
              <SelectItem className="billing__select-item" value="stripe">
                Stripe
              </SelectItem>
              <SelectItem className="billing__select-item" value="paypal">
                Paypal
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="billing__grid">
          {isLoadingTransactions ? (
            <Loading />
          ) : (
            <Table className="billing__table">
              <TableHeader className="billing__table-header">
                <TableRow className="billing__table-header-row">
                  <TableHead className="billing__table-cell">Date</TableHead>
                  <TableHead className="billing__table-cell">Amount</TableHead>
                  <TableHead className="billing__table-cell">Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="billing__table-body">
                {filteredData.length > 0 ? (
                  filteredData.map((transaction) => (
                    <TableRow className="billing__table-row" key={transaction.transactionId}>
                      <TableCell className="billing__table-cell">
                        {new Date(transaction.dateTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="billing__table-cell billing__amount">
                        {formatPrice(transaction.amount)}
                      </TableCell>
                      <TableCell className="billing__table-cell">{transaction.paymentProvider}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="billing__table-row">
                    <TableCell className="billing__table-cell text-center" colSpan={3}>
                      No transactions to display
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBilling;
