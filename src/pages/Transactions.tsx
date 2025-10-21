import { Card, CardContent } from "@/components/ui/card";

const Transactions = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Total CDF</p>
              <p className="text-sm text-red-600 font-medium">À retirer CDF</p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-lg font-bold text-gray-900">0 CDF</p>
              <p className="text-lg font-bold text-red-600">0 CDF</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;