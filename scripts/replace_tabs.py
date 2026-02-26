with open("src/pages/Transactions-Protected.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Lines 1045-1087 (0-indexed: 1044-1086) to replace
before = lines[:1044]
after = lines[1087:]

new_dropdown = [
    "          {/* Tabs de navigation - Dropdown */}\n",
    "          <Tabs value={activeTab} onValueChange={(value) => {\n",
    "            setActiveTab(value as 'clients' | 'internes' | 'swaps');\n",
    "            setCurrentPage(1);\n",
    "            setSelectedTransactions(new Set());\n",
    "          }} className=\"w-full\">\n",
    "            {/* Navigation Dropdown */}\n",
    "            <div className=\"flex justify-center mb-6\">\n",
    "              <DropdownMenu>\n",
    "                <DropdownMenuTrigger asChild>\n",
    "                  <Button\n",
    "                    variant=\"outline\"\n",
    "                    className=\"inline-flex items-center gap-2 px-4 py-2 h-10 rounded-xl border-gray-200 bg-white hover:bg-gray-50 min-w-[200px] justify-between\"\n",
    "                  >\n",
    "                    <span className=\"flex items-center gap-2\">\n",
    "                      {activeTab === 'clients' && <DollarSign className=\"h-4 w-4 text-primary\" />}\n",
    "                      {activeTab === 'internes' && <Receipt className=\"h-4 w-4 text-orange-500\" />}\n",
    "                      {activeTab === 'swaps' && <Wallet className=\"h-4 w-4 text-blue-500\" />}\n",
    "                      <span className=\"font-medium\">\n",
    "                        {activeTab === 'clients' && 'Transactions Client'}\n",
    "                        {activeTab === 'internes' && 'Opérations Internes'}\n",
    "                        {activeTab === 'swaps' && 'Swaps Comptes'}\n",
    "                      </span>\n",
    "                    </span>\n",
    "                    <ChevronDown className=\"h-4 w-4 text-gray-400\" />\n",
    "                  </Button>\n",
    "                </DropdownMenuTrigger>\n",
    "                <DropdownMenuContent align=\"center\" className=\"min-w-[200px]\">\n",
    "                  <DropdownMenuItem\n",
    "                    onClick={() => setActiveTab('clients')}\n",
    "                    className={activeTab === 'clients' ? \"bg-gray-50 cursor-pointer\" : \"cursor-pointer\"}\n",
    "                  >\n",
    "                    <span className=\"flex items-center gap-2\">\n",
    "                      <DollarSign className=\"h-4 w-4 text-primary\" />\n",
    "                      <span>Transactions Client</span>\n",
    "                    </span>\n",
    "                  </DropdownMenuItem>\n",
    "                  <DropdownMenuItem\n",
    "                    onClick={() => setActiveTab('internes')}\n",
    "                    className={activeTab === 'internes' ? \"bg-gray-50 cursor-pointer\" : \"cursor-pointer\"}\n",
    "                  >\n",
    "                    <span className=\"flex items-center gap-2\">\n",
    "                      <Receipt className=\"h-4 w-4 text-orange-500\" />\n",
    "                      <span>Opérations Internes</span>\n",
    "                    </span>\n",
    "                  </DropdownMenuItem>\n",
    "                  <DropdownMenuItem\n",
    "                    onClick={() => setActiveTab('swaps')}\n",
    "                    className={activeTab === 'swaps' ? \"bg-gray-50 cursor-pointer\" : \"cursor-pointer\"}\n",
    "                  >\n",
    "                    <span className=\"flex items-center gap-2\">\n",
    "                      <Wallet className=\"h-4 w-4 text-blue-500\" />\n",
    "                      <span>Swaps Comptes</span>\n",
    "                    </span>\n",
    "                  </DropdownMenuItem>\n",
    "                </DropdownMenuContent>\n",
    "              </DropdownMenu>\n",
    "            </div>\n",
    "\n",
]

result = before + new_dropdown + after

with open("src/pages/Transactions-Protected.tsx", "w", encoding="utf-8") as f:
    f.writelines(result)

print(f"Done. Total lines: {len(result)}")
