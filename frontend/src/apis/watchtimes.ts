// Watch Times API integration

export interface WatchTimeUser {
  _id: string;
  first_name: string;
  email: string;
  phone: string;
  ip_address: string;
  video_watch_time: string;
  createdAt: string;
  __v: number;
}

const API_BASE_URL = "https://tracker-backend-iiwt.onrender.com/api/users/"; 

/**
 * Fetch all watch time data from the API
 * @returns Array of watch time user records
 */
export const fetchWatchTimes = async (): Promise<WatchTimeUser[]> => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch watch times: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as WatchTimeUser[];
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch watch times data");
  }
};

