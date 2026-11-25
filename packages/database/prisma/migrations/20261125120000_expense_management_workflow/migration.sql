-- Extend MaintenanceExpense with Maker–Checker, payment and reconciliation fields
ALTER TABLE `MaintenanceExpense`
  ADD COLUMN `title` VARCHAR(200) NULL,
  ADD COLUMN `expenseDate` DATE NULL,
  ADD COLUMN `invoiceNumber` VARCHAR(100) NULL,
  ADD COLUMN `invoiceDate` DATE NULL,
  ADD COLUMN `taxAmount` DECIMAL(14, 2) NULL,
  ADD COLUMN `treatment` VARCHAR(20) NOT NULL DEFAULT 'ACCRUED',
  ADD COLUMN `dueDate` DATE NULL,
  ADD COLUMN `approvalStatus` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `paymentStatus` VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN `reconciliationStatus` VARCHAR(30) NOT NULL DEFAULT 'NOT_RECONCILED',
  ADD COLUMN `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedBy` CHAR(36) NULL,
  ADD COLUMN `rejectionReason` VARCHAR(500) NULL,
  ADD COLUMN `createdBy` CHAR(36) NULL;

ALTER TABLE `MaintenanceExpense`
  ADD INDEX `MaintenanceExpense_companyId_societyId_approvalStatus_idx`(`companyId`, `societyId`, `approvalStatus`),
  ADD INDEX `MaintenanceExpense_companyId_societyId_paymentStatus_idx`(`companyId`, `societyId`, `paymentStatus`),
  ADD INDEX `MaintenanceExpense_companyId_societyId_reconciliationStatus_idx`(`companyId`, `societyId`, `reconciliationStatus`);

-- Maker–Checker decision history
CREATE TABLE `ExpenseApproval` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `expenseId` CHAR(36) NOT NULL,
  `action` VARCHAR(30) NOT NULL,
  `actorUserId` CHAR(36) NOT NULL,
  `comments` VARCHAR(500) NULL,
  `reason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ExpenseApproval_companyId_societyId_expenseId_idx`(`companyId`, `societyId`, `expenseId`),
  INDEX `ExpenseApproval_expenseId_createdAt_idx`(`expenseId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Full / partial payments linked to expenses
CREATE TABLE `ExpensePayment` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `expenseId` CHAR(36) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `paidAt` DATETIME(3) NOT NULL,
  `method` VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
  `accountRef` VARCHAR(120) NULL,
  `transactionReference` VARCHAR(160) NULL,
  `recordedBy` CHAR(36) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `reversalReason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ExpensePayment_companyId_societyId_expenseId_idx`(`companyId`, `societyId`, `expenseId`),
  INDEX `ExpensePayment_expenseId_status_idx`(`expenseId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Society expense category master
CREATE TABLE `ExpenseCategory` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `monthlyBase` DECIMAL(14, 2) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ExpenseCategory_companyId_societyId_name_key`(`companyId`, `societyId`, `name`),
  INDEX `ExpenseCategory_companyId_societyId_isActive_idx`(`companyId`, `societyId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import batch tracking
CREATE TABLE `ExpenseImportBatch` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `rowCount` INT NOT NULL,
  `errorCount` INT NOT NULL DEFAULT 0,
  `importedBy` CHAR(36) NULL,
  `summary` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ExpenseImportBatch_companyId_societyId_createdAt_idx`(`companyId`, `societyId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Imported bank transactions for reconciliation
CREATE TABLE `BankTransaction` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `transactionDate` DATE NOT NULL,
  `description` VARCHAR(300) NULL,
  `reference` VARCHAR(160) NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `accountRef` VARCHAR(120) NULL,
  `source` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  `importedBy` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `BankTransaction_companyId_societyId_transactionDate_idx`(`companyId`, `societyId`, `transactionDate`),
  INDEX `BankTransaction_companyId_societyId_reference_idx`(`companyId`, `societyId`, `reference`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Payment ↔ bank transaction matches
CREATE TABLE `ReconciliationRecord` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `societyId` CHAR(36) NOT NULL,
  `expenseId` CHAR(36) NOT NULL,
  `paymentId` CHAR(36) NOT NULL,
  `bankTransactionId` CHAR(36) NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'MATCHED',
  `matchedBy` CHAR(36) NULL,
  `reason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ReconciliationRecord_companyId_societyId_expenseId_idx`(`companyId`, `societyId`, `expenseId`),
  INDEX `ReconciliationRecord_paymentId_idx`(`paymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ExpenseApproval` ADD CONSTRAINT `ExpenseApproval_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `MaintenanceExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `MaintenanceExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReconciliationRecord` ADD CONSTRAINT `ReconciliationRecord_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `MaintenanceExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
