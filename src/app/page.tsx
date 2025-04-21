import { redirect } from 'next/navigation';
import Link from "next/link";
// import Image from "next/image"; // Remove unused import

export default function Home() {
  redirect('/login');
}
