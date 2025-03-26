using FluentValidation;
using QuintessenceWebsiteBLL.CORE;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class QuestionDependencyValidator : AbstractValidator<QuestionDependency>
    {
        public QuestionDependencyValidator()
        {
            RuleFor(question => question.QuestionId)
                .NotNull().WithMessage("Question id is required.");

            RuleFor(question => question.DependsOnQuestionId)
                .NotNull().WithMessage("Depends on question id is required.");

            RuleFor(question => question.RequiredAnswer)
                .NotNull().WithMessage("Required answer is required.")
                .NotEmpty().WithMessage("Required answer cannot be empty");
        }
    }
}
