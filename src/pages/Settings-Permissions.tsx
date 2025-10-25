const SettingsPermissionsPage: React.FC = () => {
  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>();

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setIsPaymentMethodFormOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
            <p className="text-gray-500">Gérez les permissions des utilisateurs</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPermissionsPage;