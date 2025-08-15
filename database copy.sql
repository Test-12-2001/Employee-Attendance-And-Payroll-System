

-- Table: departments
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (dept_name, description) VALUES
('Human Resources', 'Handles HR and payroll matters'),
('IT Department', 'Manages company IT systems'),
('Finance', 'Handles company finances');

-- Table: employees
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(50),
    basic_salary DECIMAL(10,2) NOT NULL,
    date_hired DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample employeeble: users
-- Table: users (for login and roles)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- store hashed passwords
    role ENUM('admin', 'employee', 'manager', 'hr') NOT NULL,
    employee_id INT DEFAULT NULL, -- link to employee if role is employee or manager
    reset_code VARCHAR(6) DEFAULT NULL, -- 6-digit code for password reset
    reset_code_expires DATETIME DEFAULT NULL, -- when the reset code expires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status ENUM('present', 'absent', 'leave') DEFAULT 'present',
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_attendance_employee_date (employee_id, attendance_date)
);

-- Table: payroll_period
CREATE TABLE payroll_period (
    period_id INT AUTO_INCREMENT PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status ENUM('open','closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payroll_period (period_start, period_end, status) VALUES
('2025-08-01', '2025-08-15', 'open');

-- Table: payroll
CREATE TABLE payroll (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    payroll_period_start DATE NOT NULL,
    payroll_period_end DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    total_overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Table: leaves
CREATE TABLE leaves (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    rejected_by INT NULL,
    rejected_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Table: notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(30) NULL,
    actor_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Table: shifts
CREATE TABLE shifts (
    shift_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(100) NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    INDEX idx_shifts_date (shift_date)
);

-- Table: deductions
CREATE TABLE deductions (
    deduct_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    amount_type ENUM('fixed','percent') DEFAULT 'fixed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO deductions (name, description, amount, amount_type) VALUES
('SSS', 'Social Security System', 500.00, 'fixed'),
('PhilHealth', 'PhilHealth contribution', 300.00, 'fixed');

-- Table: employee_deductions
CREATE TABLE employee_deductions (
    emp_deduct_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    deduct_id INT NOT NULL,
    value DECIMAL(12,2) DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (deduct_id) REFERENCES deductions(deduct_id) ON DELETE CASCADE
);



-- Table: allowances
CREATE TABLE allowances (
    allowance_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    amount_type ENUM('fixed','percent') DEFAULT 'fixed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO allowances (name, description, amount, amount_type) VALUES
('Transportation', 'Transport allowance', 1000.00, 'fixed'),
('Meal', 'Meal allowance', 500.00, 'fixed');

-- Table: employee_allowances
CREATE TABLE employee_allowances (
    emp_allow_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    allowance_id INT NOT NULL,
    value DECIMAL(12,2) DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (allowance_id) REFERENCES allowances(allowance_id) ON DELETE CASCADE
);



-- Table: system_settings
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value) VALUES
('company_name', 'My Company'),
('overtime_multiplier', '1.25'),
('undertime_deduction_per_hour', '100.00'),
('cutoff_1_start', '1'),
('cutoff_1_end', '15'),
('cutoff_2_start', '16'),
('cutoff_2_end', 'last_day'),
('payroll_currency', 'PHP');

-- Table: audit_logs
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
