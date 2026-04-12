
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class QuestionsDAL : IQuestionsDAL
    {
        private readonly QuintessenceDbContext _context;

        public QuestionsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<QuestionsDTO>?> GetQuestions(long id)
        {
            try
            {
                return await _context.Questions.Where(u => u.FormId == id).Include(q => q.Type).Include(q => q.Options).Include(q => q.QuestionDependency).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetQuestions: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> WillRequiredDependentQuestionsApply(long formId, long userId, long submissionId)
        {
            try
            {
                var userAnswers = await _context.Answers
                    .Where(a => a.UserId == userId && a.SubmissionId == submissionId)
                    .GroupBy(a => a.QuestionId)
                    .ToDictionaryAsync(g => g.Key, g => g.Select(a => a.Answer).ToList());

                var requiredDependentQuestions = await _context.Questions
                    .Where(q => q.FormId == formId
                        && q.QuestionDependency != null
                        && q.IsRequired == true)  
                    .Include(q => q.QuestionDependency)
                    .ToListAsync();

                foreach (var question in requiredDependentQuestions)
                {
                    var dependency = question.QuestionDependency;

                    if (userAnswers.ContainsKey(dependency.DependsOnQuestionId)
                        && userAnswers[dependency.DependsOnQuestionId].Contains(dependency.RequiredAnswer))
                    {
                        return true;
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WillRequiredDependentQuestionsApply: {ex.Message}");
                return false;
            }
        }

        public async Task<List<QuestionsDTO>> GetSubmissionQuestions(long id, long submissionId, long userId)
        {
            try
            {
                var questions = await _context.Questions
                    .Where(q => q.FormId == id && q.QuestionDependency == null)
                    .Include(q => q.Type)
                    .Include(q => q.Options)
                    .Include(q => q.Answers)
                    .ToListAsync();

                var questionsDTO = questions
                    .Select(q => new QuestionsDTO
                    {
                        QuestionId = q.QuestionId,
                        Question = q.Question,
                        TypeId = q.TypeId,
                        Type = q.Type,
                        IsRequired = q.IsRequired,
                        Options = q.Options?.Select(o => new OptionsDTO
                        {
                            OptionId = o.OptionId,
                            AnswerOption = o.AnswerOption
                        }).ToList(),
                        Answers = q.Answers?.Where(a => a.UserId == userId && a.SubmissionId == submissionId)
                            .Select(a => new AnswersDTO
                            {
                                AnswerId = a.AnswerId,
                                Answer = a.Answer,
                            }).ToList()
                    })
                    .ToList();

                return questionsDTO;
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetQuestionsWithAnswers: " + ex.Message);
                return null;
            }
        }

        public async Task<List<QuestionsDTO>> GetSubmissionDependentQuestions(long formId, long submissionId, long userId)
        {
            try
            {
                var userAnswers = await _context.Answers.Where(a => a.UserId == userId && a.SubmissionId == submissionId).GroupBy(a => a.QuestionId).ToDictionaryAsync(g => g.Key, g => g.Select(a => a.Answer).ToList());

                var dependencyQuestions = await _context.Questions
                    .Where(q => q.FormId == formId && q.QuestionDependency != null)
                    .Include(q => q.Type)
                    .Include(q => q.Options)
                    .Include(q => q.QuestionDependency)
                    .Include(q => q.Answers)
                    .ToListAsync();

                var dependencyQuestionsDTO = dependencyQuestions
                    .Select(q => new QuestionsDTO
                    {
                        QuestionId = q.QuestionId,
                        Question = q.Question,
                        TypeId = q.TypeId,
                        Type = q.Type,
                        QuestionDependency = q.QuestionDependency,
                        IsRequired = q.IsRequired,
                        Options = q.Options?.Select(o => new OptionsDTO
                        {
                            OptionId = o.OptionId,
                            AnswerOption = o.AnswerOption
                        }).ToList(),
                        Answers = q.Answers?.Where(a => a.UserId == userId && a.SubmissionId == submissionId)
                            .Select(a => new AnswersDTO
                            {
                                AnswerId = a.AnswerId,
                                Answer = a.Answer,
                            }).ToList()
                    })
                    .ToList();

                var requiredQuestions = dependencyQuestionsDTO.Where(q => q.QuestionDependency != null && userAnswers
                .ContainsKey(q.QuestionDependency.DependsOnQuestionId) && userAnswers
                .ContainsKey(q.QuestionDependency.DependsOnQuestionId) && userAnswers[q.QuestionDependency.DependsOnQuestionId]
                .Contains(q.QuestionDependency.RequiredAnswer))
                .ToList();

                return requiredQuestions;
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetDependentQuestions: " + ex.Message);
                return null;
            }
        }


        public async Task<List<QuestionsDTO>> GetQuestionsWithAnswers(long id, long userId)
        {
            try
            {
                var questions = await _context.Questions
                    .Where(q => q.FormId == id && q.QuestionDependency == null)
                    .Include(q => q.Type)
                    .Include(q => q.Options)
                    .Include(q => q.Answers)
                    .ToListAsync();

                var questionsDTO = questions
                    .Select(q => new QuestionsDTO
                    {
                        QuestionId = q.QuestionId,
                        Question = q.Question,
                        TypeId = q.TypeId,
                        Type = q.Type,
                        IsRequired = q.IsRequired,
                        Options = q.Options?.Select(o => new OptionsDTO
                        {
                            OptionId = o.OptionId,
                            AnswerOption = o.AnswerOption
                        }).ToList(),
                        Answers = q.Answers?.Where(a => a.UserId == userId)
                            .OrderByDescending(a => a.SubmissionId)
                            .Take(1)
                            .Select(a => new AnswersDTO
                            {
                                AnswerId = a.AnswerId,
                                Answer = a.Answer,
                            }).ToList()
                    })
                    .ToList();

                return questionsDTO;
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetQuestionsWithAnswers: " + ex.Message);
                return null;
            }
        }

        public async Task<List<QuestionsDTO>> GetDependentQuestions(long formId, long userId, long submissionId)
        {
            try
            {
                var userAnswers = await _context.Answers.Where(a => a.UserId == userId && a.SubmissionId == submissionId).GroupBy(a => a.QuestionId).ToDictionaryAsync(g => g.Key, g => g.Select(a => a.Answer).ToList());

                var dependencyQuestions = await _context.Questions
                    .Where(q => q.FormId == formId && q.QuestionDependency != null)
                    .Include(q => q.Type)
                    .Include(q => q.Options)
                    .Include(q => q.QuestionDependency)
                    .Include(q => q.Answers)
                    .ToListAsync();

                var dependencyQuestionsDTO = dependencyQuestions
                    .Select(q => new QuestionsDTO
                    {
                        QuestionId = q.QuestionId,
                        Question = q.Question,
                        TypeId = q.TypeId,
                        Type = q.Type,
                        QuestionDependency = q.QuestionDependency,
                        IsRequired = q.IsRequired,
                        Options = q.Options?.Select(o => new OptionsDTO
                        {
                            OptionId = o.OptionId,
                            AnswerOption = o.AnswerOption
                        }).ToList(),
                        Answers = q.Answers?.Where(a => a.UserId == userId)
                            .OrderByDescending(a => a.SubmissionId)
                            .Take(1)
                            .Select(a => new AnswersDTO
                            {
                                AnswerId = a.AnswerId,
                                Answer = a.Answer,
                            }).ToList()
                    })
                    .ToList();

                var requiredQuestions = dependencyQuestionsDTO.Where(q => q.QuestionDependency != null && userAnswers
                .ContainsKey(q.QuestionDependency.DependsOnQuestionId) && userAnswers
                .ContainsKey(q.QuestionDependency.DependsOnQuestionId) && userAnswers[q.QuestionDependency.DependsOnQuestionId]
                .Contains(q.QuestionDependency.RequiredAnswer))
                .ToList();

                return requiredQuestions;
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetDependentQuestions: " + ex.Message);
                return null;
            }
        }


        public async Task<QuestionsDTO?> AddQuestion(QuestionsDTO question)
        {
            try
            {
                await _context.Questions.AddAsync(question);
                await _context.SaveChangesAsync();
                return question;
            }
            catch (Exception ex)
            {
                Console.WriteLine("AddQuestion: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> SaveQuestionDependency(QuestionDependencyDTO question)
        {
            try
            {
                var questionDependency = await _context.QuestionDependency.FirstOrDefaultAsync(q => q.QuestionId == question.QuestionId);
                if  (questionDependency != null)
                {
                    questionDependency.DependsOnQuestionId = question.DependsOnQuestionId;
                    questionDependency.RequiredAnswer = question.RequiredAnswer;
                }
                else
                {
                    await _context.QuestionDependency.AddAsync(question);
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveQuestionDependency: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> DeleteQuestionDependency(long questionId)
        {
            try
            {
                var question = await _context.QuestionDependency.FindAsync(questionId);
                if (question == null) return true;

                _context.QuestionDependency.Remove(question);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteQuestionDependency: " + ex.Message);
                return false;
            }

        }
        public async Task<bool> UpdateQuestion(QuestionsDTO questionDto)
        {
            try
            {
                var question = await _context.Questions.Include(o => o.Options).FirstOrDefaultAsync(q => q.QuestionId == questionDto.QuestionId);
                if (question == null) return false;

                question.FormId = questionDto.FormId;
                question.TypeId = questionDto.TypeId;
                question.Question = questionDto.Question;
                question.IsRequired = questionDto.IsRequired;

                if (questionDto.Options != null)
                {
                    if (question.Options != null)
                    {
                        // Remove options that are no longer in the DTO
                        var optionsToRemove = question.Options.Where(o => !questionDto.Options.Any(dto => dto.OptionId == o.OptionId)).ToList();
                        foreach (var option in optionsToRemove)
                        {
                            _context.Options.Remove(option);
                        }

                        // Update existing options and add new ones
                        foreach (var dtoOption in questionDto.Options)
                        {
                            if (dtoOption.OptionId != null && dtoOption.OptionId > 0)
                            {
                                // This is an existing option - update it
                                var existingOption = question.Options.FirstOrDefault(o => o.OptionId == dtoOption.OptionId);
                                if (existingOption != null)
                                {
                                    existingOption.AnswerOption = dtoOption.AnswerOption;
                                }
                            }
                            else
                            {
                                var newOption = new OptionsDTO
                                {
                                    QuestionId = question.QuestionId,
                                    AnswerOption = dtoOption.AnswerOption
                                };

                                _context.Options.Add(newOption);
                            }
                        }
                    }
                    else
                    {
                        foreach (var dtoOption in questionDto.Options)
                        {
                            var newOption = new OptionsDTO
                            {
                                QuestionId = question.QuestionId,
                                AnswerOption = dtoOption.AnswerOption
                            };

                            _context.Options.Add(newOption);
                        }
                    }
                }

                _context.Questions.Update(question);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("UpdateQuestion: " + ex.Message);
                return false;
            }
        }


        public async Task<bool> DeleteQuestion(long questionId)
        {
            try
            {
                var question = await _context.Questions.FindAsync(questionId);
                if (question == null) return false;

                _context.Questions.Remove(question);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteQuestion: " + ex.Message);
                return false;
            }
        }
    }
}
