import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"RupeeWise · Money with intention",description:"A personal finance tracker focused on your ₹65,000 monthly savings goal."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
