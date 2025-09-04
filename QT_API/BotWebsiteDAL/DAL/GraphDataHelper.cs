using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public static class GraphDataHelper
    {
        public static List<dynamic> FillMissingDates<T>(
            List<T> actualData,
            DateTime startDate,
            DateTime endDate,
            Func<T, DateTime> getDate,
            Func<T, dynamic> createDataPoint,
            Func<DateTime, dynamic> createEmptyDataPoint)
        {
            var result = new List<dynamic>();
            var dataLookup = actualData.ToDictionary(item => getDate(item).Date, createDataPoint);

            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                if (dataLookup.TryGetValue(date, out var existingData))
                {
                    result.Add(existingData);
                }
                else
                {
                    result.Add(createEmptyDataPoint(date));
                }
            }

            return result;
        }
    }
}
