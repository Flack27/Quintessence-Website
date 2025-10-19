using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class FormSubmissionsDAL : IFormSubmissionsDAL
    {
        private QuintessenceDbContext _context;

        public FormSubmissionsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<FormSubmissionDTO>> GetFormsSubmissions()
        {
            try
            {
                return await _context.FormSubmission
                    .Where(s => s.IsComplete == true)
                    .Include(u => u.User)
                    .Include(f => f.Form)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetFormsSubmissions: " + ex.Message);
                return null;
            }
        }

        public async Task<FormSubmissionDTO?> GetFormsSubmission(long submissionId)
        {
            try
            {
                return await _context.FormSubmission.Include(u => u.User).Include(f => f.Form).FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetFormsSubmission: " + ex.Message);
                return null;
            }
        }

        public async Task<int> GetFormSubmissionsCount()
        {
            try
            {
                return await _context.FormSubmission.CountAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetFormSubmissionsCount: " + ex.Message);
                return 0;
            }
        }

        public async Task<bool> SaveFormSubmissionApproval(long submissionId, bool approved)
        {
            try
            {
                var form = await _context.FormSubmission.FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
                if (form != null)
                {
                    form.Approved = approved;
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveFormSubmissionApproval: " + ex.Message);
                return false;
            }
        }

        // New method for server-wide form submissions data
        public async Task<List<dynamic>> GetServerFormSubmissionsData(DateTime startDate, DateTime endDate)
        {
            try
            {
                var actualData = await _context.FormSubmission
                    .Where(s => s.SubmitDate >= startDate && s.SubmitDate <= endDate)
                    .GroupBy(s => s.SubmitDate.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        date = g.Key,
                        submissions = g.Count()
                    })
                    .ToListAsync();

                return GraphDataHelper.FillMissingDates(
                    actualData,
                    startDate,
                    endDate,
                    item => item.date,
                    item => new
                    {
                        date = item.date.ToString("yyyy-MM-dd"),
                        submissions = item.submissions
                    },
                    date => new
                    {
                        date = date.ToString("yyyy-MM-dd"),
                        submissions = 0
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetServerFormSubmissionsData: " + ex.Message);
                return new List<dynamic>();
            }
        }

        // New method for getting submissions count in a period
        public async Task<int> GetSubmissionsCountForPeriod(DateTime startDate, DateTime endDate)
        {
            try
            {
                return await _context.FormSubmission
                    .CountAsync(s => s.SubmitDate >= startDate && s.SubmitDate <= endDate);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetSubmissionsCountForPeriod: " + ex.Message);
                return 0;
            }
        }
    }
}