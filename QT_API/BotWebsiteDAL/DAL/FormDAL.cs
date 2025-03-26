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
    public class FormDAL : IFormDAL
    {
        private QuintessenceDbContext _context;

        public FormDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<FormDTO>> GetForms()
        {
            try
            {
                return await _context.Form.Where(d => d.Deleted != true).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetForms: " + ex.Message);
                return null;
            }
        }

        public async Task<FormDTO?> GetForm(long id)
        {
            try
            {
                return await _context.Form
                    .Include(f => f.Questions)
                        .ThenInclude(q => q.QuestionDependency)
                    .Include(f => f.Questions)
                        .ThenInclude(q => q.Options)
                    .Include(f => f.Questions)
                        .ThenInclude(q => q.Type)
                    .Where(d => d.Deleted != true)
                    .FirstOrDefaultAsync(f => f.FormId == id);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetForms: " + ex.Message);
                return null;
            }
        }

        public async Task<FormDTO?> GetActiveForm()
        {
            try
            {
                return await _context.Form.FirstOrDefaultAsync(u => u.IsActive == true);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetForms: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> SetActiveForm(long formId)
        {
            try
            {
                var forms = await _context.Form.ToListAsync();

                var formToActivate = forms.FirstOrDefault(f => f.FormId == formId);
                if (formToActivate == null) return false;

                foreach (var form in forms)
                {
                    form.IsActive = form.FormId == formId;
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SetActiveForm: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> UpdateForm(FormDTO dto)
        {
            try
            {
                var form = await _context.Form.FirstOrDefaultAsync(d => d.FormId == dto.FormId);
                if(form == null) return false;

                form.Title = dto.Title;
                form.Description = dto.Description;

                await _context.SaveChangesAsync();
                return true;
            }

            catch (Exception ex)
            {
                Console.WriteLine("UpdateForm: " + ex.Message);
                return false;
            }
        }

        public async Task<long?> AddForm(FormDTO dto)
        {
            try
            {
                await _context.Form.AddAsync(dto);
                await _context.SaveChangesAsync();

                return dto.FormId;
            }

            catch (Exception ex)
            {
                Console.WriteLine("AddForm: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> DeleteForm(long formId)
        {
            try
            {
                var form = await _context.Form.FindAsync(formId);
                if (form == null) return false;

                form.Deleted = true;
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteForm: " + ex.Message);
                return false;
            }
        }
    }
}
