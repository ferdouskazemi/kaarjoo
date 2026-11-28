import React from 'react';
import { cn } from './cn.js';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, children, ...props }) => (
  <div className="w-full overflow-x-auto border border-border rounded-[var(--radius-md)] bg-surface">
    <table className={cn('w-full text-sm text-start border-collapse', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <thead className={cn('bg-surface-2 text-muted text-xs uppercase border-b border-border', className)} {...props} />
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <tbody className={cn('divide-y divide-border', className)} {...props} />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, ...props }) => (
  <tr className={cn('hover:bg-surface-2/60 transition-colors', className)} {...props} />
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <th className={cn('px-3 py-2.5 text-start font-medium', className)} {...props} />
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <td className={cn('px-3 py-2.5 text-text align-middle', className)} {...props} />
);
