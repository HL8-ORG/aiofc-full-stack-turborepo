'use client';

import Loading from '@/components/Loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { useGetTransactionsQuery } from '@/state/api';
import { useAuthStore } from '@/stores/authStore';

import React, { useState } from 'react';

const TeacherBilling = () => {
  const [paymentType, setPaymentType] = useState('all');
  const { user } = useAuthStore();
  const { data: transactions, isLoading: isLoadingTransactions } = useGetTransactionsQuery(user?.id || '', {
    skip: !user,
  });

  const filteredData =
    transactions?.filter((transaction) => {
      const matchesTypes = paymentType === 'all' || transaction.paymentProvider === paymentType;
      return matchesTypes;
    }) || [];

  if (!user) return <div>请登录以查看您的账单信息。</div>;

  return (
    <div className="billing">
      <div className="billing__container">
        <h2 className="billing__title">支付历史</h2>
        <div className="billing__filters">
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className="billing__select">
              <SelectValue placeholder="支付类型" />
            </SelectTrigger>

            <SelectContent className="billing__select-content">
              <SelectItem className="billing__select-item" value="all">
                所有类型
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
                  <TableHead className="billing__table-cell">日期</TableHead>
                  <TableHead className="billing__table-cell">金额</TableHead>
                  <TableHead className="billing__table-cell">支付方式</TableHead>
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
                      暂无交易记录
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

export default TeacherBilling;
