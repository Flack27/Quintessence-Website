using FluentValidation;
using QuintessenceWebsiteBLL.CORE;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class QuestionsAddValidator : AbstractValidator<Questions>
    {
        public QuestionsAddValidator()
        {
            RuleFor(question => question.QuestionText)
                .NotEmpty().WithMessage("Question text is required.")
                .MaximumLength(200).WithMessage("Question text must be less than 200 characters.");

            RuleFor(question => question.TypeId)
                .NotNull().WithMessage("Question type is required.");

            RuleFor(question => question.FormId)
                .NotNull().WithMessage("Form id is required.");
        }
    }
}
