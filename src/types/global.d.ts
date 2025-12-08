// Global type declarations to workaround module resolution issues

declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module 'react-router-dom' {
  export function useNavigate(): any;
  export interface NavigateFunction {
    (to: string, options?: any): void;
  }
}

declare module 'react-datepicker' {
  interface DatePickerProps {
    selected?: Date | null;
    onChange?: (date: Date | null) => void;
    dateFormat?: string;
    className?: string;
    placeholderText?: string;
    highlightDates?: Date[];
    todayButton?: string;
    showYearDropdown?: boolean;
    scrollableYearDropdown?: boolean;
    yearDropdownItemNumber?: number;
    minDate?: Date;
    maxDate?: Date;
    filterDate?: (date: Date) => boolean;
    disabled?: boolean;
  }
  
  const DatePicker: React.FC<DatePickerProps>;
  export default DatePicker;
}

// Extend ImportMeta for environment variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
