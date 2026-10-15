export interface Plan {
  id: string;
  title: string;
  description: string;
  highlight?: boolean;
  type?: "monthly" | "yearly";
  currency?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyAvailable?: boolean;
  buttonText: string;
  badge?: string;
  disabled?: boolean;
  features: {
    name: string;
    icon: string;
    iconColor?: string;
  }[];
}
