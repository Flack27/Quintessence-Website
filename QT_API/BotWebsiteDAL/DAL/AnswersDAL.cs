using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class AnswersDAL : IAnswersDAL
    {
        private readonly QuintessenceDbContext _context;

        public AnswersDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<long?> Submit(FormSubmissionDTO formSubmission)
        {
            try
            {
                await _context.FormSubmission.AddAsync(formSubmission);
                await _context.SaveChangesAsync();
                return formSubmission.SubmissionId;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Submit: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> SaveAnswers(List<AnswersDTO> answers)
        {
            try
            {
                foreach (var answer in answers)
                {
                    await _context.Answers.AddAsync(answer);
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveAnswer: " + ex.Message);
                return false;
            }
        }
    }
}
