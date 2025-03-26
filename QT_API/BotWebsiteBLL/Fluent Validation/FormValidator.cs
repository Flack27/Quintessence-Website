using FluentValidation;
using QuintessenceWebsiteBLL.CORE;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class FormValidator : AbstractValidator<Form>
    {
        public FormValidator()
        {
            RuleFor(form => form.Title)
                .NotEmpty().WithMessage("Title is required.")
                .NotNull().WithMessage("Title cannot be null.")
                .MaximumLength(100).WithMessage("Title must be less than 100 characters.");

            RuleFor(form => form.Description)
                .NotNull().WithMessage("Description cannot be null.")
                .MaximumLength(5000).WithMessage("Description must be less than 5000 characters.");
        }
    }
}
