// hooks/useFetch.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const useFetch = (key, url, options = {}) => {
  const fetchData = async ({ signal }) => {
    const response = await axios.get(url, { signal }); // 👈 pass signal to axios
    return response.data;
  };

  return useQuery({
    queryKey: [key, url],
    queryFn: fetchData,
    enabled: !!url,
    ...options,
  });
};

export default useFetch;
