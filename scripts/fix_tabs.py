import re

with open("src/pages/Transactions-Protected.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Old TabsList section to replace
old_section = '''          }} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="inline-flex w-full max-w-2xl p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl gap-1">
                <TabsTrigger
                  value="clients"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions Client</span>
                  <span className="sm:hidden">Clients</span>
                </TabsTrigger>
                <TabsTrigger
                  value="internes"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20"
                >
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Opérations Internes</span>
                  <span className="sm:hidden">Internes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="swaps"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/20"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Swaps Comptes</span>
                  <span className="sm:hidden">Swaps</span>
                </TabsTrigger>
              </TabsList>
            </div>'''

# New DropdownMenu section
new_section = '''          }} className="w-full">
            {/* Navigation Dropdown - replaces horizontal tabs */}
            <div className="flex justify-center mb-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="inline-flex items-center gap-2 px-4 py-2 h-10 rounded-xl border-gray-200 bg-white hover:bg-gray-50 min-w-[200px] justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {activeTab === 'clients' && <DollarSign className="h-4 w-4 text-primary" />}
                      {activeTab === 'internes' && <Receipt className="h-4 w-4 text-orange-500" />}
                      {activeTab === 'swaps' && <Wallet className="h-4 w-4 text-blue-500" />}
                      <span className="font-medium">
                        {activeTab === 'clients' && 'Transactions Client'}
                        {activeTab === 'internes' && 'Opérations Internes'}
                        {activeTab === 'swaps' && 'Swaps Comptes'}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[200px]">
                  <DropdownMenuItem
                    onClick={() => setActiveTab('clients')}
                    className={activeTab === 'clients' ? "bg-gray-50 cursor-pointer" : "cursor-pointer"}
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>Transactions Client</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setActiveTab('internes')}
                    className={activeTab === 'internes' ? "bg-gray-50 cursor-pointer" : "cursor-pointer"}
                  >
                    <span className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-orange-500" />
                      <span>Opérations Internes</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setActiveTab('swaps')}
                    className={activeTab === 'swaps' ? "bg-gray-50 cursor-pointer" : "cursor-pointer"}
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span>Swaps Comptes</span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>'''

if old_section in content:
    content = content.replace(old_section, new_section)
    with open("src/pages/Transactions-Protected.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Tabs replaced with dropdown")
else:
    print("NOT FOUND: Could not find the TabsList section")
    # Print a snippet to debug
    idx = content.find("TabsList")
    if idx != -1:
        print(f"Found TabsList at index {idx}")
        print("Context:")
        print(repr(content[idx-100:idx+200]))
