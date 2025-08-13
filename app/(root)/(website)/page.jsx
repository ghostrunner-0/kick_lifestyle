"use client";

import { useEffect, useState } from "react";
import Banner from "@/components/application/website/Banner";
import axios from "axios";
import CategoryBanner from "@/components/application/website/CategoryBanner";
import Trusted from "@/components/application/website/Trusted";

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data } = await axios.get(`/api/banners?active=true`);
        if (data?.success) {
          setBanners(
            [...data.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          );
        }
      } catch (err) {
        console.error("Failed to fetch banners", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  return (
    <main>
      <Banner banners={banners} loading={loading} />
      <CategoryBanner/>
      <Trusted/>
    </main>
  );
}
