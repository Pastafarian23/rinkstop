import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function NCAARedirect() {
  redirect('/directory/college');
}