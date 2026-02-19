import Logo from "@/components/logo.tsx";
import { ModeToggle } from "@/components/mode-toggle.tsx";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description: string;
}

export const AuthLayout = ({ children, title = "AtoiTalk", description }: AuthLayoutProps) => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 sm:px-0">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full sm:w-auto"
      >
        <Card className="w-full border-0 shadow-none rounded-none bg-transparent sm:w-[450px] px-4 sm:border sm:shadow-sm sm:rounded-xl sm:bg-card mx-auto z-20">
          <CardHeader className="p-0 sm:p-6 ">
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center ">
                <Logo mode={theme} width={35} height={40} />
                <p className="text-4xl flex items-center gap-1">{title}</p>
              </div>
              <ModeToggle />
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 pt-4 sm:pt-0">{children}</CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
