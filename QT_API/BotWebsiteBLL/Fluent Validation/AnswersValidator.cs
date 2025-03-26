using FluentValidation;

namespace QuintessenceWebsiteBLL.CORE
{
    public class AnswersValidator : AbstractValidator<Answers>
    {
        public AnswersValidator()
        {
            RuleFor(answer => answer.Answer)
                .MaximumLength(255).WithMessage("Answer cannot exceed 255 characters.");

            RuleFor(answer => answer.FormId)
                .NotNull().WithMessage("Form id is required.");

            RuleFor(answer => answer.QuestionId)
                .NotNull().WithMessage("Question id is required.");

            RuleFor(answer => answer.UserId)
                .NotNull().WithMessage("User id is required.");
        }
    }
}
