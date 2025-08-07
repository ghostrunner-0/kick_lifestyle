// hooks/useFetch.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/**
 * @param {string} key - Unique cache key for the query
 * @param {string} url - API endpoint to fetch data from
 * @param {object} [options] - Optional TanStack useQuery options
 */
const useFetch = (key, url, options = {}) => {
  const fetchData = async () => {
    const response = await axios.get(url);
    return response.data;
  };

  return useQuery({
    queryKey: [key, url], // helps cache based on both key and url
    queryFn: fetchData,
    enabled: !!url, // avoids running on undefined url
    ...options,
  });
};

export default useFetch;
