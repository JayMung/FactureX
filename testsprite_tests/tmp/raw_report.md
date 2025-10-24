
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** CoxiPay
- **Date:** 2025-10-24
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** User Login Success
- **Test Code:** [TC001_User_Login_Success.py](./TC001_User_Login_Success.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/1c082d15-e116-454f-bd63-13aaa1ad3f19
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** User Login Failure with Invalid Credentials
- **Test Code:** [TC002_User_Login_Failure_with_Invalid_Credentials.py](./TC002_User_Login_Failure_with_Invalid_Credentials.py)
- **Test Error:** Login page or form not found on the base URL page. Cannot perform login test with invalid credentials. Task stopped.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/sonner.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/tooltip.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/hooks/usePermissions.ts:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/layout/Layout.tsx:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/76577665-ea8d-43c4-a219-adfdb9babd57
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Admin Setup Initial Configuration
- **Test Code:** [TC003_Admin_Setup_Initial_Configuration.py](./TC003_Admin_Setup_Initial_Configuration.py)
- **Test Error:** The initial admin setup process cannot be verified because the admin setup form does not appear on first launch with an empty database. The page is empty with no interactive elements to proceed with superuser creation or application settings configuration.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/pages/Login.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/contexts/PageContext.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/pages/Clients-Protected.tsx:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/494da04e-066a-4c72-808b-0ca62b0c622d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Dashboard Real-Time Statistics Display
- **Test Code:** [TC004_Dashboard_Real_Time_Statistics_Display.py](./TC004_Dashboard_Real_Time_Statistics_Display.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/336c68c9-f3ec-4c16-99b5-2b8518763076
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Client CRUD Operations with History Tracking
- **Test Code:** [TC005_Client_CRUD_Operations_with_History_Tracking.py](./TC005_Client_CRUD_Operations_with_History_Tracking.py)
- **Test Error:** Stopped testing due to critical issue: The admin account creation form rejects a valid email address as invalid, preventing admin account creation and login. Cannot proceed with client CRUD operations or history log verification without access. Please fix the email validation issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/pagination-custom.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/ui/popover.tsx:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/80da1050-550d-4a98-be04-7d61cd5c3f5a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** CSV Import for Clients with Validation and Duplicate Detection
- **Test Code:** [TC006_CSV_Import_for_Clients_with_Validation_and_Duplicate_Detection.py](./TC006_CSV_Import_for_Clients_with_Validation_and_Duplicate_Detection.py)
- **Test Error:** Login failed with 'Invalid login credentials' error. Cannot access client import page to verify CSV import functionality. Please provide valid credentials or fix login issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/globals.css:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/App.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/react-dom_client.js?v=7442b9f8:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/829b29be-5f20-4958-8fe5-7bd53e4da90b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Transaction Management with Multi-Currency Support and Filtering
- **Test Code:** [TC007_Transaction_Management_with_Multi_Currency_Support_and_Filtering.py](./TC007_Transaction_Management_with_Multi_Currency_Support_and_Filtering.py)
- **Test Error:** Testing cannot proceed because the admin account creation is blocked by an invalid email validation error. Please fix the email validation or provide valid admin credentials to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/pages/Login.tsx:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/6caacc3f-d240-4e43-9f63-14c9403a5e17
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Invoice and Quotation Creation with Auto-Numbering and PDF Export
- **Test Code:** [TC008_Invoice_and_Quotation_Creation_with_Auto_Numbering_and_PDF_Export.py](./TC008_Invoice_and_Quotation_Creation_with_Auto_Numbering_and_PDF_Export.py)
- **Test Error:** Testing stopped due to critical issue: The admin account creation form blocks valid email addresses with an invalid email error, preventing access to the system and further testing of invoice and quotation features.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/pages/AdminSetup.tsx:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/d9eef18f-a8bb-4d76-b4be-d93248966486
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Role-Based Access Control Enforcement and Row-Level Security
- **Test Code:** [TC009_Role_Based_Access_Control_Enforcement_and_Row_Level_Security.py](./TC009_Role_Based_Access_Control_Enforcement_and_Row_Level_Security.py)
- **Test Error:** Testing stopped due to critical issue: The system blocks creation of admin and limited role users with valid email addresses due to email validation errors. Cannot proceed with verifying CRUD operations and data views with role-based restrictions. Please fix the email validation issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/App.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/globals.css:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/chunk-THYVJR3I.js?v=7442b9f8:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/69789ccc-e232-4ee2-916f-c547d8857f83
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Activity Logging with Detailed Audit Trail and Notification Center
- **Test Code:** [TC010_Activity_Logging_with_Detailed_Audit_Trail_and_Notification_Center.py](./TC010_Activity_Logging_with_Detailed_Audit_Trail_and_Notification_Center.py)
- **Test Error:** Login failed due to invalid credentials. Cannot proceed with testing critical user actions logging and notification center functionality. Please provide valid credentials or resolve the login issue.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/auth/AuthProvider.tsx:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/8f6f4fca-6a7f-4ea1-8d28-363fbc59040b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Settings Management for Company Info, Exchange Rates, and User Permissions
- **Test Code:** [TC011_Settings_Management_for_Company_Info_Exchange_Rates_and_User_Permissions.py](./TC011_Settings_Management_for_Company_Info_Exchange_Rates_and_User_Permissions.py)
- **Test Error:** The testing task to verify administrator capabilities to update company information, manage exchange rates, and configure user roles could not be completed due to the application page being completely empty with no interactive elements or login form. The issue has been reported. Please provide a working environment or fix the UI to proceed with testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/App.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/globals.css:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/30d4677a-0837-4302-95a2-efe2c9a26f12
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Bulk Operations for Clients and Transactions
- **Test Code:** [TC012_Bulk_Operations_for_Clients_and_Transactions.py](./TC012_Bulk_Operations_for_Clients_and_Transactions.py)
- **Test Error:** The task to verify bulk actions including export, deletion, and status updates could not be completed because the main page at http://localhost:8080/ is empty with no interactive elements or navigation options visible. The issue has been reported. No further actions could be performed.
Browser Console Logs:
[ERROR] WebSocket connection to 'ws://localhost:8080/?token=BHHGetfjglTm' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/@vite/client:801:0)
[ERROR] [vite] failed to connect to websocket (Error: WebSocket closed without opened.).  (at http://localhost:8080/@vite/client:840:18)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/components/auth/AuthProvider.tsx:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/879185d0-4348-43f8-ae29-20ba329d0672
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Form Validation for Client and Transaction Inputs
- **Test Code:** [TC013_Form_Validation_for_Client_and_Transaction_Inputs.py](./TC013_Form_Validation_for_Client_and_Transaction_Inputs.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/0e191f00-62cc-437e-a874-56812fd50140
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Responsive UI and Reusable Components Verification
- **Test Code:** [TC014_Responsive_UI_and_Reusable_Components_Verification.py](./TC014_Responsive_UI_and_Reusable_Components_Verification.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/def90a8d-885b-4cbf-87b3-7e31441cfeb3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Real-Time Data Refresh and Caching on Dashboard
- **Test Code:** [TC015_Real_Time_Data_Refresh_and_Caching_on_Dashboard.py](./TC015_Real_Time_Data_Refresh_and_Caching_on_Dashboard.py)
- **Test Error:** Unable to complete the task due to persistent email validation errors on the admin setup form preventing creation of the first administrator account. This blocks the ability to create clients or transactions and verify real-time dashboard updates with TanStack Query caching and pagination. Please fix the email validation issue to proceed.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/pages/NotFound.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/src/hooks/use-toast.ts:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=7442b9f8:0:0)
[ERROR] 404 Error: User attempted to access non-existent route: /create-client (at http://localhost:8080/src/pages/NotFound.tsx:29:16)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=7442b9f8:4393:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ddnxtuhswmewoxrwswzg.supabase.co/auth/v1/signup:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5f96a991-bff0-4292-b270-791ec72c20b3/ba24741e-3443-4afd-bc52-e5efb8a3f826
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---